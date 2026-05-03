import { Memory } from '@mastra/memory';
import type { ForageExpeditionResult } from '../pantheon/mud-client';
import { PantheonInftClient } from '../inft/inft-client';
import { writeAgentMemoryDelta } from '../inft/memory-writer';
import {
  hashPantheonP2pBody,
  type PantheonP2pEnvelope,
} from '../p2p/message-envelope';
import { isZeroGStorageConfigured } from '../zerog/storage';

const recentExpeditionLimit = 8;
const terrainLearningLimit = 12;

export const playerAgentMemory = new Memory({
  options: {
    lastMessages: 8,
    workingMemory: {
      enabled: true,
      scope: 'resource',
      template: `# Pantheon Player Memory

## Current World State
- Position:
- Energy:
- Pending Action:
- Last Status:

## Recent Expeditions
- None yet.

## Movement Pattern
- No movement observed yet.

## Terrain Learnings
- No forage observations yet.

## Agent Communications
- No agent messages yet.

## Next Strategic Goal
- Build a useful local forage map while keeping enough energy to sleep before wasteful actions.
`,
    },
  },
});

export type ExpeditionMemoryContext = {
  threadId?: string;
  resourceId?: string;
  action?: string;
  turnId?: string;
};

export type AgentMessageMemoryContext = {
  threadId?: string;
  resourceId?: string;
  direction: 'sent' | 'received';
  remotePeerId: string;
  turnId?: string;
};

export async function rememberForageExpedition(
  result: ForageExpeditionResult,
  context: ExpeditionMemoryContext | undefined,
): Promise<{
  stored: boolean;
  note?: string;
  reason?: string;
  inft?: {
    stored: boolean;
    uri?: string;
    rootHash?: `0x${string}`;
    txHash?: `0x${string}`;
    intelligentData?: {
      description: string;
      dataHash: `0x${string}`;
      txHash?: `0x${string}`;
      updated: boolean;
      reason?: string;
    };
    reason?: string;
  };
}> {
  const threadId = context?.threadId;
  const resourceId = context?.resourceId;
  const note = formatExpeditionNote(result);
  const inft = await attachMemoryToInft(result, context, note);

  if (!threadId || !resourceId) {
    return {
      stored: false,
      reason: 'Missing Mastra memory thread/resource id.',
      note,
      inft,
    };
  }

  try {
    const existing =
      (await playerAgentMemory.getWorkingMemory({
        threadId,
        resourceId,
      })) ?? '';
    const workingMemory = buildWorkingMemory(existing, result, note);

    await playerAgentMemory.updateWorkingMemory({
      threadId,
      resourceId,
      workingMemory,
    });
  } catch (error) {
    return {
      stored: false,
      reason: `Mastra working memory unavailable: ${formatError(error)}`,
      note,
      inft,
    };
  }

  return {
    stored: true,
    note,
    inft,
  };
}

export async function rememberAgentMessage(
  envelope: PantheonP2pEnvelope,
  context: AgentMessageMemoryContext,
): Promise<{
  stored: boolean;
  note?: string;
  reason?: string;
  inft?: {
    stored: boolean;
    uri?: string;
    rootHash?: `0x${string}`;
    txHash?: `0x${string}`;
    intelligentData?: {
      description: string;
      dataHash: `0x${string}`;
      txHash?: `0x${string}`;
      updated: boolean;
      reason?: string;
    };
    reason?: string;
  };
}> {
  const threadId = context.threadId;
  const resourceId = context.resourceId;

  if (!threadId || !resourceId) {
    return {
      stored: false,
      reason: 'Missing Mastra memory thread/resource id.',
    };
  }

  const existing =
    (await playerAgentMemory.getWorkingMemory({
      threadId,
      resourceId,
    })) ?? '';
  const note = formatAgentMessageNote(envelope, context);
  const workingMemory = upsertAgentCommunication(existing, note);

  await playerAgentMemory.updateWorkingMemory({
    threadId,
    resourceId,
    workingMemory,
  });

  return {
    stored: true,
    note,
    inft: await attachAgentMessageToInft(envelope, context, note),
  };
}

async function attachMemoryToInft(
  result: ForageExpeditionResult,
  context: ExpeditionMemoryContext | undefined,
  note: string,
): Promise<{
  stored: boolean;
  uri?: string;
  rootHash?: `0x${string}`;
  txHash?: `0x${string}`;
  intelligentData?: {
    description: string;
    dataHash: `0x${string}`;
    txHash?: `0x${string}`;
    updated: boolean;
    reason?: string;
  };
  reason?: string;
}> {
  if (!isInftMemoryEnabled()) {
    return {
      stored: false,
      reason: 'INFT memory upload is not configured.',
    };
  }

  try {
    const client = PantheonInftClient.fromEnv();
    const ownerClient = process.env.AGENT_OWNER_PRIVATE_KEY?.trim()
      ? PantheonInftClient.fromEnv({ privateKeyEnv: 'AGENT_OWNER_PRIVATE_KEY' })
      : undefined;
    const write = await writeAgentMemoryDelta(client, {
      turnId: context?.turnId ?? createTurnId(result),
      action: context?.action ?? 'economic-cycle',
      intelligentDataClient: ownerClient,
      summary: result.summary,
      observations: result.forages.map((forage) => ({
        kind: 'forage',
        terrainId: forage.terrainId,
        itemId: forage.itemId,
        amount: forage.amount,
        x: forage.x,
        y: forage.y,
      })),
      metadata: {
        note,
        status: result.status,
        actions: result.actions,
        tilesConsidered: result.tilesConsidered,
        player: result.player
          ? {
              x: result.player.x,
              y: result.player.y,
              energy: result.player.energy,
              maxEnergy: result.player.maxEnergy,
              pendingAction: result.player.pendingAction,
            }
          : undefined,
        threadId: context?.threadId,
        resourceId: context?.resourceId,
      },
    });

    return {
      stored: true,
      uri: write.encryptedDeltaURI,
      rootHash: write.storage?.rootHash,
      txHash: write.txHash,
      intelligentData: write.intelligentData,
    };
  } catch (error) {
    return {
      stored: false,
      reason: `INFT memory unavailable: ${formatError(error)}`,
    };
  }
}

function isInftMemoryEnabled(): boolean {
  const configured =
    Boolean(process.env.AGENT_INFT_ADDRESS?.trim()) &&
    Boolean(process.env.AGENT_TOKEN_ID?.trim()) &&
    isZeroGStorageConfigured();
  const value = process.env.AGENT_MEMORY_0G_ENABLED?.trim().toLowerCase();

  if (!value) return configured;

  return ['1', 'true', 'yes', 'on'].includes(value);
}

function createTurnId(result: ForageExpeditionResult): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const position = result.player ? `${result.player.x}-${result.player.y}` : 'unknown';

  return `${stamp}-${result.status}-${position}`;
}

function buildWorkingMemory(
  existing: string,
  result: ForageExpeditionResult,
  note: string,
): string {
  const recentExpeditions = [
    `- ${note}`,
    ...extractSectionBullets(existing, 'Recent Expeditions'),
  ].filter((line) => !line.includes('None yet.'));
  const terrainLearnings = mergeTerrainLearnings(
    extractSectionBullets(existing, 'Terrain Learnings'),
    result,
  );
  const movementPattern = formatMovementPattern(result);
  const player = result.player;
  const pendingAction = player?.pendingAction
    ? `${player.pendingAction.action} readyAt=${player.pendingAction.readyAt}`
    : 'none';

  return `# Pantheon Player Memory

## Current World State
- Position: ${player ? `${player.x},${player.y}` : 'unknown'}
- Energy: ${player ? `${player.energy}/${player.maxEnergy}` : 'unknown'}
- Pending Action: ${pendingAction}
- Last Status: ${result.status} - ${result.summary}

## Recent Expeditions
${limitLines(recentExpeditions, recentExpeditionLimit).join('\n') || '- None yet.'}

## Movement Pattern
- ${movementPattern}

## Terrain Learnings
${limitLines(terrainLearnings, terrainLearningLimit).join('\n') || '- No forage observations yet.'}

## Agent Communications
${extractAgentCommunications(existing)}

## Next Strategic Goal
- ${nextStrategicGoal(result)}
`;
}

async function attachAgentMessageToInft(
  envelope: PantheonP2pEnvelope,
  context: AgentMessageMemoryContext,
  note: string,
): Promise<{
  stored: boolean;
  uri?: string;
  rootHash?: `0x${string}`;
  txHash?: `0x${string}`;
  intelligentData?: {
    description: string;
    dataHash: `0x${string}`;
    txHash?: `0x${string}`;
    updated: boolean;
    reason?: string;
  };
  reason?: string;
}> {
  if (!isInftMemoryEnabled()) {
    return {
      stored: false,
      reason: 'INFT memory upload is not configured.',
    };
  }

  try {
    const client = PantheonInftClient.fromEnv();
    const ownerClient = process.env.AGENT_OWNER_PRIVATE_KEY?.trim()
      ? PantheonInftClient.fromEnv({ privateKeyEnv: 'AGENT_OWNER_PRIVATE_KEY' })
      : undefined;
    const write = await writeAgentMemoryDelta(client, {
      turnId: context.turnId ?? `p2p-${context.direction}-${envelope.messageId}`,
      action: `p2p-${context.direction}`,
      intelligentDataClient: ownerClient,
      summary: note,
      observations: [
        {
          kind: 'p2p-message',
          peerId: context.remotePeerId,
          messageId: envelope.messageId,
          direction: context.direction,
          channel: envelope.channel,
          contentHash: hashPantheonP2pBody(envelope),
          fromTokenId: envelope.fromTokenId,
          toPeerId: envelope.toPeerId,
        },
      ],
      metadata: {
        envelope,
        threadId: context.threadId,
        resourceId: context.resourceId,
      },
    });

    return {
      stored: true,
      uri: write.encryptedDeltaURI,
      rootHash: write.storage?.rootHash,
      txHash: write.txHash,
      intelligentData: write.intelligentData,
    };
  } catch (error) {
    return {
      stored: false,
      reason: `INFT memory unavailable: ${formatError(error)}`,
    };
  }
}

function formatAgentMessageNote(
  envelope: PantheonP2pEnvelope,
  context: AgentMessageMemoryContext,
): string {
  const body = envelope.body.length > 160
    ? `${envelope.body.slice(0, 157)}...`
    : envelope.body;

  return `${new Date().toISOString()} ${context.direction} p2p ${envelope.channel} token=${envelope.fromTokenId} peer=${context.remotePeerId} message=${envelope.messageId}: ${body}`;
}

function upsertAgentCommunication(existing: string, note: string): string {
  const sectionLines = [
    `- ${note}`,
    ...extractSectionBullets(existing, 'Agent Communications'),
  ].filter((line) => !line.includes('No agent messages yet.'));
  const communications = limitLines(sectionLines, recentExpeditionLimit).join('\n') ||
    '- No agent messages yet.';

  if (existing.includes('## Agent Communications')) {
    return existing.replace(
      /## Agent Communications\n[\s\S]*?(?=\n## |\n?$)/,
      `## Agent Communications\n${communications}\n`,
    );
  }

  const nextGoalHeader = '\n## Next Strategic Goal';
  if (existing.includes(nextGoalHeader)) {
    return existing.replace(
      nextGoalHeader,
      `\n## Agent Communications\n${communications}\n${nextGoalHeader}`,
    );
  }

  return `${existing.trim()}\n\n## Agent Communications\n${communications}\n`;
}

function extractAgentCommunications(existing: string): string {
  const communications = extractSectionBullets(existing, 'Agent Communications')
    .filter((line) => !line.includes('No agent messages yet.'));

  return limitLines(communications, recentExpeditionLimit).join('\n') ||
    '- No agent messages yet.';
}

function formatExpeditionNote(result: ForageExpeditionResult): string {
  const player = result.player;
  const position = player ? `${player.x},${player.y}` : 'unknown';
  const energy = player ? `${player.energy}/${player.maxEnergy}` : 'unknown';
  const forageSummary =
    result.forages.length > 0
      ? result.forages
          .map((forage) => {
            const terrain = forage.terrainId ? `${forage.terrainId}:` : '';

            return `${terrain}${forage.amount} ${forage.itemId}@${forage.x},${forage.y}`;
          })
          .join('; ')
      : 'no forage';

  return `${new Date().toISOString()} status=${result.status}, pos=${position}, energy=${energy}, actions=${result.actions.length}, ${forageSummary}`;
}

function formatMovementPattern(result: ForageExpeditionResult): string {
  const moves = result.actions.filter((action) => action.startsWith('movePath('));

  if (moves.length === 0) {
    return result.forages.length > 0
      ? 'Foraged reachable adjacent/current tiles without movement.'
      : 'No movement in the latest expedition.';
  }

  return moves.slice(-3).join('; ');
}

function mergeTerrainLearnings(
  existing: string[],
  result: ForageExpeditionResult,
): string[] {
  const learnings = new Map<string, string>();

  for (const line of existing) {
    const key = terrainLearningKey(line);
    if (key) learnings.set(key, line);
  }

  for (const forage of result.forages) {
    if (!forage.terrainId) continue;

    learnings.set(
      forage.terrainId,
      `- ${forage.terrainId}: last yielded ${forage.amount} ${forage.itemId} at ${forage.x},${forage.y}`,
    );
  }

  return Array.from(learnings.values()).filter(
    (line) => !line.includes('No forage observations yet.'),
  );
}

function nextStrategicGoal(result: ForageExpeditionResult): string {
  if (result.status === 'pending-action') {
    return 'Wait for the pending action to become ready, then resolve before starting another batch.';
  }

  if (result.status === 'low-energy') {
    return 'Let sleep finish or resolve recovery before foraging again.';
  }

  if (result.status === 'no-targets') {
    return 'Expand scan radius or reposition to discover fresh forageable terrain.';
  }

  if (result.status === 'blocked') {
    return 'Inspect the blocker with primitive tools, then return to batched expeditions.';
  }

  return 'Run another compact forage batch near the best learned terrain while energy remains productive.';
}

function extractSectionBullets(memory: string, sectionName: string): string[] {
  const pattern = new RegExp(`## ${escapeRegExp(sectionName)}\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = memory.match(pattern);

  if (!match) return [];

  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '));
}

function terrainLearningKey(line: string): string | undefined {
  const match = line.match(/^- ([^:]+):/);

  return match?.[1];
}

function limitLines(lines: string[], limit: number): string[] {
  return lines
    .filter((line, index, allLines) => allLines.indexOf(line) === index)
    .slice(0, limit);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
