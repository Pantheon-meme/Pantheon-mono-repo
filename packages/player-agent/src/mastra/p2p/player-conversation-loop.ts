import { playerConversationAgent } from '../agents/player-conversation-agent';
import {
  formatPersonality,
  getPlayerPersonality,
} from '../agents/player-personality';
import type {
  PlayerAgentP2pRuntime,
  PlayerAgentPeer,
  P2pSendResult,
} from './player-agent-p2p';
import type { PantheonP2pEnvelope } from './message-envelope';

export type PlayerConversationLoop = {
  stop: () => Promise<void>;
};

const conversationThreadId =
  process.env.PLAYER_AGENT_CONVERSATION_THREAD_ID ??
  `${process.env.PLAYER_AGENT_THREAD_ID ?? 'pantheon-autoplayer'}-conversation`;
const conversationResourceId =
  process.env.PLAYER_AGENT_CONVERSATION_RESOURCE_ID ??
  `${process.env.PLAYER_AGENT_RESOURCE_ID ?? 'pantheon-player'}-social`;

export function startPlayerConversationLoop(
  p2p: PlayerAgentP2pRuntime,
): PlayerConversationLoop | undefined {
  if (!readBooleanEnv('PLAYER_AGENT_CONVERSATION_ENABLED', true)) {
    return undefined;
  }

  const intervalMs = readIntegerEnv('PLAYER_AGENT_CONVERSATION_INTERVAL_MS', 15_000);
  const maxSteps = readIntegerEnv('PLAYER_AGENT_CONVERSATION_MAX_STEPS', 2);
  const initiateEveryCycles = readIntegerEnv(
    'PLAYER_AGENT_CONVERSATION_INITIATE_EVERY_CYCLES',
    4,
  );
  const personality = getPlayerPersonality();
  let stopped = false;
  let running = false;
  let cycle = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  console.log(`[player-agent] conversation sub-agent enabled ${formatPersonality(personality)}`);

  const schedule = () => {
    if (stopped) return;
    timer = setTimeout(tick, intervalMs);
  };

  const tick = async () => {
    if (running || stopped) {
      schedule();
      return;
    }

    running = true;
    cycle += 1;

    try {
      const peers = await p2p.refreshPeers();
      const poll = await p2p.pollAndRemember({
        turnId: `conversation-${Date.now()}-${cycle}`,
      });

      if (poll.received > 0 || poll.rejected > 0) {
        console.log(
          `[player-agent] conversation p2p received=${poll.received} remembered=${poll.remembered} rejected=${poll.rejected}`,
        );
      }

      const shouldInitiate =
        poll.messages.length === 0 &&
        peers.length > 0 &&
        initiateEveryCycles > 0 &&
        cycle % initiateEveryCycles === 0;

      if (poll.messages.length > 0 || shouldInitiate) {
        const outbound = await createConversationMessage({
          cycle,
          maxSteps,
          ownPeerId: p2p.ownPeerId,
          peers,
          inbound: poll.messages,
          initiate: shouldInitiate,
        });

        if (outbound) {
          const targetPeers = chooseTargetPeers(peers, poll.messages);
          const sends = await p2p.broadcastAndRemember(outbound, {
            turnId: `conversation-${Date.now()}-${cycle}`,
            channel: 'agent-conversation',
            peers: targetPeers,
          });

          logConversationSends(sends);
        }
      }
    } catch (error) {
      console.warn(`[player-agent] conversation loop failed: ${formatError(error)}`);
    } finally {
      running = false;
      schedule();
    }
  };

  void tick();

  return {
    stop: async () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      while (running) {
        await sleep(100);
      }
    },
  };
}

async function createConversationMessage(input: {
  cycle: number;
  maxSteps: number;
  ownPeerId: string;
  peers: PlayerAgentPeer[];
  inbound: PantheonP2pEnvelope[];
  initiate: boolean;
}): Promise<string | undefined> {
  const prompt = buildConversationPrompt(input);
  const result = await playerConversationAgent.generate(prompt, {
    maxSteps: input.maxSteps,
    toolChoice: 'none',
    memory: {
      thread: conversationThreadId,
      resource: conversationResourceId,
    },
  });
  const text = result.text.trim();

  if (!text || text.toUpperCase() === 'SILENCE') {
    return undefined;
  }

  return text.length > 500 ? `${text.slice(0, 497)}...` : text;
}

function buildConversationPrompt(input: {
  cycle: number;
  ownPeerId: string;
  peers: PlayerAgentPeer[];
  inbound: PantheonP2pEnvelope[];
  initiate: boolean;
}): string {
  const peerSummary = input.peers.length > 0
    ? input.peers
        .map((peer) => `token=${peer.tokenId ?? 'unknown'} peer=${peer.peerId}`)
        .join('\n')
    : 'No peers currently discovered.';
  const inbound = input.inbound.length > 0
    ? input.inbound
        .map(
          (message) =>
            `fromToken=${message.fromTokenId} peer=${message.fromPeerId} channel=${message.channel}: ${message.body}`,
        )
        .join('\n')
    : 'No new inbound messages.';

  return `Conversation cycle ${input.cycle}.

Own AXL peer id: ${input.ownPeerId}

Discovered peers:
${peerSummary}

New inbound messages:
${inbound}

Task:
${input.initiate
  ? 'Open a useful conversation with discovered agents.'
  : 'Reply to the inbound messages if a reply would help the relationship or coordination.'}

Return one outbound message for the selected peers, or SILENCE.`;
}

function chooseTargetPeers(
  peers: PlayerAgentPeer[],
  inbound: PantheonP2pEnvelope[],
): PlayerAgentPeer[] {
  const inboundPeerIds = new Set(inbound.map((message) => message.fromPeerId));
  const directPeers = peers.filter((peer) => inboundPeerIds.has(peer.peerId));

  return directPeers.length > 0 ? directPeers : peers.slice(0, 3);
}

function logConversationSends(sends: P2pSendResult[]) {
  if (sends.length === 0) return;

  const sent = sends.filter((send) => send.sent).length;
  const remembered = sends.filter((send) => send.remembered).length;
  const failed = sends.length - sent;

  console.log(
    `[player-agent] conversation sent=${sent}/${sends.length} remembered=${remembered} failed=${failed}`,
  );
}

function readIntegerEnv(name: string, fallback: number): number {
  const value = process.env[name]?.trim();
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;

  return ['1', 'true', 'yes', 'on'].includes(value)
    ? true
    : ['0', 'false', 'no', 'off'].includes(value)
      ? false
      : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
