import { Memory } from '@mastra/memory';
import type { ForageExpeditionResult } from '../pantheon/mud-client';

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

## Next Strategic Goal
- Build a useful local forage map while keeping enough energy to sleep before wasteful actions.
`,
    },
  },
});

export type ExpeditionMemoryContext = {
  threadId?: string;
  resourceId?: string;
};

export async function rememberForageExpedition(
  result: ForageExpeditionResult,
  context: ExpeditionMemoryContext | undefined,
): Promise<{ stored: boolean; note?: string; reason?: string }> {
  const threadId = context?.threadId;
  const resourceId = context?.resourceId;

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
  const note = formatExpeditionNote(result);
  const workingMemory = buildWorkingMemory(existing, result, note);

  await playerAgentMemory.updateWorkingMemory({
    threadId,
    resourceId,
    workingMemory,
  });

  return { stored: true, note };
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

## Next Strategic Goal
- ${nextStrategicGoal(result)}
`;
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
