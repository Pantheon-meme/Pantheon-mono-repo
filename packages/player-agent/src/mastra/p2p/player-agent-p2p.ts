import type { Hex } from 'viem';
import { AxlClient, axlPeerIdSchema } from './axl-client';
import {
  createPantheonP2pEnvelope,
  parsePantheonP2pEnvelope,
  serializePantheonP2pEnvelope,
  verifyPantheonP2pEnvelope,
  type PantheonP2pEnvelope,
} from './message-envelope';
import { rememberAgentMessage } from '../agents/player-memory';
import { loadLocalEnvFiles } from '../load-env';

export type PlayerAgentPeer = {
  tokenId?: string;
  peerId: string;
};

export type PlayerAgentP2pRuntime = {
  ownPeerId: string;
  peers: PlayerAgentPeer[];
  pollAndRemember: (options: { turnId: string }) => Promise<P2pPollResult>;
  broadcastAndRemember: (body: string, options: { turnId: string; channel?: string }) => Promise<P2pSendResult[]>;
};

export type P2pPollResult = {
  received: number;
  remembered: number;
  rejected: number;
  errors: string[];
};

export type P2pSendResult = {
  peerId: string;
  messageId?: string;
  sent: boolean;
  remembered: boolean;
  error?: string;
};

export async function createPlayerAgentP2pRuntime(options: {
  threadId: string;
  resourceId: string;
}): Promise<PlayerAgentP2pRuntime | undefined> {
  loadLocalEnvFiles();
  if (!readBooleanEnv('PLAYER_AGENT_AXL_ENABLED', false)) return undefined;

  const privateKey = readExecutorPrivateKey();
  const tokenId = process.env.AGENT_TOKEN_ID?.trim();
  if (!tokenId) {
    throw new Error('AGENT_TOKEN_ID is required when PLAYER_AGENT_AXL_ENABLED=true');
  }

  const client = new AxlClient();
  const ownPeerId = await client.getPeerId();
  const peers = parsePeerList(process.env.PLAYER_AGENT_AXL_PEERS)
    .filter((peer) => peer.peerId !== ownPeerId);
  const receiveLimit = readIntegerEnv('PLAYER_AGENT_AXL_RECV_LIMIT', 10);

  return {
    ownPeerId,
    peers,
    pollAndRemember: (pollOptions) =>
      pollAndRemember(client, {
        ...options,
        ownPeerId,
        receiveLimit,
        turnId: pollOptions.turnId,
      }),
    broadcastAndRemember: (body, sendOptions) =>
      broadcastAndRemember(client, {
        ...options,
        body,
        channel: sendOptions.channel,
        ownPeerId,
        peers,
        privateKey,
        tokenId,
        turnId: sendOptions.turnId,
      }),
  };
}

async function pollAndRemember(
  client: AxlClient,
  options: {
    threadId: string;
    resourceId: string;
    ownPeerId: string;
    receiveLimit: number;
    turnId: string;
  },
): Promise<P2pPollResult> {
  const result: P2pPollResult = {
    received: 0,
    remembered: 0,
    rejected: 0,
    errors: [],
  };

  for (let index = 0; index < options.receiveLimit; index += 1) {
    const received = await client.receive();
    if (!received) break;

    result.received += 1;

    try {
      const envelope = parsePantheonP2pEnvelope(received.body);
      if (envelope.fromPeerId !== received.fromPeerId) {
        throw new Error('AXL sender peer id does not match envelope sender');
      }
      if (envelope.toPeerId !== options.ownPeerId) {
        throw new Error('Envelope is addressed to a different peer');
      }
      if (!(await verifyPantheonP2pEnvelope(envelope))) {
        throw new Error('Envelope signature is invalid');
      }

      const memory = await rememberAgentMessage(envelope, {
        threadId: options.threadId,
        resourceId: options.resourceId,
        direction: 'received',
        remotePeerId: received.fromPeerId,
        turnId: `${options.turnId}-recv-${result.received}`,
      });

      if (memory.stored) result.remembered += 1;
    } catch (error) {
      result.rejected += 1;
      result.errors.push(formatError(error));
    }
  }

  return result;
}

async function broadcastAndRemember(
  client: AxlClient,
  options: {
    threadId: string;
    resourceId: string;
    body: string;
    channel?: string;
    ownPeerId: string;
    peers: PlayerAgentPeer[];
    privateKey: Hex;
    tokenId: string;
    turnId: string;
  },
): Promise<P2pSendResult[]> {
  const results: P2pSendResult[] = [];

  for (const peer of options.peers) {
    let envelope: PantheonP2pEnvelope | undefined;

    try {
      envelope = await createPantheonP2pEnvelope({
        privateKey: options.privateKey,
        fromTokenId: options.tokenId,
        fromPeerId: options.ownPeerId,
        toPeerId: peer.peerId,
        channel: options.channel,
        body: options.body,
      });

      await client.send(peer.peerId, serializePantheonP2pEnvelope(envelope));
      const memory = await rememberAgentMessage(envelope, {
        threadId: options.threadId,
        resourceId: options.resourceId,
        direction: 'sent',
        remotePeerId: peer.peerId,
        turnId: `${options.turnId}-sent-${results.length + 1}`,
      });

      results.push({
        peerId: peer.peerId,
        messageId: envelope.messageId,
        sent: true,
        remembered: memory.stored,
      });
    } catch (error) {
      results.push({
        peerId: peer.peerId,
        messageId: envelope?.messageId,
        sent: false,
        remembered: false,
        error: formatError(error),
      });
    }
  }

  return results;
}

function parsePeerList(value: string | undefined): PlayerAgentPeer[] {
  if (!value?.trim()) return [];

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [maybeTokenId, maybePeerId] = entry.includes(':')
        ? entry.split(':', 2)
        : [undefined, entry];
      const peerId = axlPeerIdSchema.parse((maybePeerId ?? '').trim());

      return {
        tokenId: maybeTokenId?.trim() || undefined,
        peerId,
      };
    });
}

function readExecutorPrivateKey(): Hex {
  const privateKey =
    process.env.AGENT_EXECUTOR_PRIVATE_KEY ??
    process.env.MUD_PRIVATE_KEY ??
    process.env.VITE_MUD_PRIVATE_KEY;

  if (!privateKey?.trim()) {
    throw new Error(
      'AGENT_EXECUTOR_PRIVATE_KEY or MUD_PRIVATE_KEY is required when PLAYER_AGENT_AXL_ENABLED=true',
    );
  }

  return privateKey as Hex;
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

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
