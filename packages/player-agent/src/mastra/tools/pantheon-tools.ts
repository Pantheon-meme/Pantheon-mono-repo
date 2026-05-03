import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { rememberForageExpedition } from '../agents/player-memory';
import { makePantheonMudClient } from '../pantheon/mud-client';

const client = makePantheonMudClient();

export const getPlayerStateTool = createTool({
  id: 'get-player-state',
  description: 'Read the current Pantheon MUD player position, energy, pending action, and last known action log.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    player: z.unknown().optional(),
    exists: z.boolean(),
  }),
  execute: async () => {
    const player = await client.getPlayer();

    return { exists: Boolean(player), player };
  },
});

export const spawnPlayerTool = createTool({
  id: 'spawn-player',
  description: 'Create the wallet player in the Pantheon MUD world at a starting tile. Use this before moving or foraging when no player exists.',
  inputSchema: z.object({
    x: z.number().int().default(100).describe('Spawn tile x coordinate.'),
    y: z.number().int().default(100).describe('Spawn tile y coordinate.'),
  }),
  outputSchema: z.unknown(),
  execute: async ({ x, y }) => client.spawn(x, y),
});

export const scanNearbyLandsTool = createTool({
  id: 'scan-nearby-lands',
  description: 'Scan nearby onchain terrain tiles and score forageable lands by expected item generation and learned observations.',
  inputSchema: z.object({
    radius: z.number().int().min(1).max(8).default(4),
  }),
  outputSchema: z.unknown(),
  execute: async ({ radius }) => ({
    tiles: await client.scanNearby(radius ?? 4),
    knownForageLands: client.getKnownForageLands(),
  }),
});

export const runForageExpeditionTool = createTool({
  id: 'run-forage-expedition',
  description:
    'Run a batched Pantheon forage expedition without extra LLM calls: resolve ready actions, scan, choose productive nearby forage tiles, move paths, forage several targets, and optionally start sleep when energy is low.',
  inputSchema: z.object({
    radius: z.number().int().min(1).max(8).default(5),
    maxForages: z.number().int().min(1).max(10).default(4),
    maxMoveStepsPerTarget: z.number().int().min(1).max(16).default(8),
    minEnergy: z.number().int().min(0).default(20),
    sleepWhenLowEnergy: z.boolean().default(true),
    spawnIfMissing: z.boolean().default(true),
  }),
  outputSchema: z.unknown(),
  execute: async (
    {
      radius,
      maxForages,
      maxMoveStepsPerTarget,
      minEnergy,
      sleepWhenLowEnergy,
      spawnIfMissing,
    },
    context,
  ) => {
    const result = await client.runForageExpedition({
      radius,
      maxForages,
      maxMoveStepsPerTarget,
      minEnergy,
      sleepWhenLowEnergy,
      spawnIfMissing,
    });

    result.memory = await rememberForageExpedition(result, {
      threadId: context.agent?.threadId,
      resourceId: context.agent?.resourceId,
      action: 'forage-expedition',
    });

    return result;
  },
});

export const runEconomicCycleTool = createTool({
  id: 'run-economic-cycle',
  description:
    'Run one deterministic money-making cycle with minimal LLM use: resolve/spawn, harvest or plant when obvious, pick up valuable owned drops, sell profitable inventory at the bank, otherwise forage.',
  inputSchema: z.object({
    radius: z.number().int().min(1).max(8).default(5),
    maxForages: z.number().int().min(1).max(10).default(4),
    maxPickups: z.number().int().min(0).max(12).default(4),
    maxMoveStepsPerTarget: z.number().int().min(1).max(24).default(10),
    minEnergy: z.number().int().min(0).default(20),
    sleepWhenLowEnergy: z.boolean().default(true),
    spawnIfMissing: z.boolean().default(true),
    worldObjectLookback: z.number().int().min(1).max(400).default(80),
    sellWhenValueAtLeast: z.number().int().min(0).default(48),
    sellWhenWeightRatioAtLeast: z.number().min(0).max(1).default(0.75),
    plantWhenSeedsAvailable: z.boolean().default(true),
    harvestRadius: z.number().int().min(1).max(8).default(5),
    useLlmStrategyHint: z.string().max(500).optional(),
  }),
  outputSchema: z.unknown(),
  execute: async (
    {
      radius,
      maxForages,
      maxPickups,
      maxMoveStepsPerTarget,
      minEnergy,
      sleepWhenLowEnergy,
      spawnIfMissing,
      worldObjectLookback,
      sellWhenValueAtLeast,
      sellWhenWeightRatioAtLeast,
      plantWhenSeedsAvailable,
      harvestRadius,
      useLlmStrategyHint,
    },
    context,
  ) => {
    const result = await client.runEconomicCycle({
      radius,
      maxForages,
      maxPickups,
      maxMoveStepsPerTarget,
      minEnergy,
      sleepWhenLowEnergy,
      spawnIfMissing,
      worldObjectLookback,
      sellWhenValueAtLeast,
      sellWhenWeightRatioAtLeast,
      plantWhenSeedsAvailable,
      harvestRadius,
      useLlmStrategyHint,
    });

    result.memory = await rememberForageExpedition(result, {
      threadId: context.agent?.threadId,
      resourceId: context.agent?.resourceId,
      action: 'economic-cycle',
    });

    return result;
  },
});

export const movePlayerTool = createTool({
  id: 'move-player',
  description: 'Move the player one orthogonal tile to an exact adjacent x/y tile.',
  inputSchema: z.object({
    x: z.number().int(),
    y: z.number().int(),
  }),
  outputSchema: z.unknown(),
  execute: async ({ x, y }) => client.move(x, y),
});

export const moveTowardTool = createTool({
  id: 'move-toward',
  description: 'Move toward a target tile with an ordered Manhattan path. Use this when the best forage tile is not adjacent.',
  inputSchema: z.object({
    targetX: z.number().int(),
    targetY: z.number().int(),
    maxSteps: z.number().int().min(1).max(12).default(6),
  }),
  outputSchema: z.unknown(),
  execute: async ({ targetX, targetY, maxSteps }) =>
    client.moveToward(targetX, targetY, maxSteps ?? 6),
});

export const forageTileTool = createTool({
  id: 'forage-tile',
  description: 'Forage a tile near the player and record the result so future scans can learn which terrain generates more items.',
  inputSchema: z.object({
    x: z.number().int(),
    y: z.number().int(),
  }),
  outputSchema: z.unknown(),
  execute: async ({ x, y }) => client.forage(x, y),
});

export const sleepTool = createTool({
  id: 'sleep',
  description: 'Start a Pantheon sleep action to recover energy. Use when energy is low or no productive forage can be done.',
  inputSchema: z.object({}),
  outputSchema: z.unknown(),
  execute: async () => client.sleep(),
});

export const resolveActionTool = createTool({
  id: 'resolve-action',
  description: 'Resolve a ready pending MUD action such as completed sleep before starting more movement or forage.',
  inputSchema: z.object({}),
  outputSchema: z.unknown(),
  execute: async () => client.resolveAction(),
});

export const pantheonTools = {
  getPlayerStateTool,
  spawnPlayerTool,
  scanNearbyLandsTool,
  runForageExpeditionTool,
  runEconomicCycleTool,
  movePlayerTool,
  moveTowardTool,
  forageTileTool,
  sleepTool,
  resolveActionTool,
};
