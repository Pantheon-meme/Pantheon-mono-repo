import { Agent } from '@mastra/core/agent';
import { playerAgent } from './mastra/agents/player-agent';
import { rememberForageExpedition } from './mastra/agents/player-memory';
import { PantheonInftClient } from './mastra/inft/inft-client';
import { playerAgentModel } from './mastra/model-config';
import {
  createPlayerAgentP2pRuntime,
  type P2pSendResult,
} from './mastra/p2p/player-agent-p2p';
import { startPlayerConversationLoop } from './mastra/p2p/player-conversation-loop';
import { makePantheonMudClient } from './mastra/pantheon/mud-client';

const turnDelayMs = readIntegerEnv('PLAYER_AGENT_TURN_DELAY_MS', 5000);
const maxTurns = readIntegerEnv('PLAYER_AGENT_MAX_TURNS', 0);
const maxSteps = readIntegerEnv('PLAYER_AGENT_MAX_STEPS', 6);
const threadId = process.env.PLAYER_AGENT_THREAD_ID ?? 'pantheon-autoplayer';
const resourceId = process.env.PLAYER_AGENT_RESOURCE_ID ?? 'pantheon-player';
const useLlmLoop = readBooleanEnv('PLAYER_AGENT_USE_LLM', false);
const llmEveryTurns = readIntegerEnv('PLAYER_AGENT_LLM_EVERY_TURNS', 0);
const p2pBroadcastEveryTurns = readIntegerEnv(
  'PLAYER_AGENT_AXL_BROADCAST_EVERY_TURNS',
  0,
);
const conversationEnabled = readBooleanEnv('PLAYER_AGENT_CONVERSATION_ENABLED', true);
const debugStrategyOnly = readBooleanEnv(
  'PLAYER_AGENT_DEBUG_STRATEGY_ONLY',
  false,
);
const client = makePantheonMudClient();
const requireMatchingPlayerAndExecutor = readBooleanEnv(
  'PLAYER_AGENT_REQUIRE_EXECUTOR_MATCH',
  true,
);

type EconomicStrategy = {
  label: string;
  radius: number;
  maxForages: number;
  maxPickups: number;
  maxMoveStepsPerTarget: number;
  minEnergy: number;
  sleepWhenLowEnergy: boolean;
  worldObjectLookback: number;
  sellWhenValueAtLeast: number;
  sellWhenWeightRatioAtLeast: number;
  plantWhenSeedsAvailable: boolean;
  harvestRadius: number;
  hint: string;
};

let currentStrategy = readDefaultEconomicStrategy();
const strategyAgent = new Agent({
  id: 'pantheon-strategy-agent',
  name: 'Pantheon Strategy Agent',
  instructions:
    'You produce compact JSON strategy settings for a deterministic Pantheon player loop. Return JSON only.',
  model: playerAgentModel,
});
let stopping = false;

process.on('SIGINT', () => {
  stopping = true;
  console.log('\n[player-agent] stopping after current turn...');
});

process.on('SIGTERM', () => {
  stopping = true;
});

await runAutoplayer();

async function runAutoplayer() {
  let turn = 0;

  await assertPlayerExecutorMatch();
  const p2p = await createPlayerAgentP2pRuntime({ threadId, resourceId });
  const conversationLoop = p2p ? startPlayerConversationLoop(p2p) : undefined;

  console.log('[player-agent] autonomous loop started');
  console.log(
    `[player-agent] delay=${turnDelayMs}ms maxTurns=${maxTurns || 'infinite'} mode=${formatMode()} maxSteps=${maxSteps}`,
  );
  if (p2p) {
    console.log(
      `[player-agent] AXL p2p enabled peer=${p2p.ownPeerId} configuredPeers=${p2p.peers.length}`,
    );
  }
  console.log(formatStrategy(currentStrategy));

  if (!useLlmLoop && llmEveryTurns > 0) {
    currentStrategy = await refreshEconomicStrategy(0, currentStrategy);
    console.log(formatStrategy(currentStrategy));

    if (debugStrategyOnly) {
      console.log('[player-agent] debug strategy-only mode complete');
      return;
    }
  }

  while (!stopping && (maxTurns === 0 || turn < maxTurns)) {
    turn += 1;
    console.log(`\n[player-agent] turn ${turn}`);

    try {
      if (p2p && !conversationEnabled) {
        const poll = await p2p.pollAndRemember({ turnId: `autoplayer-${turn}` });
        if (poll.received > 0 || poll.rejected > 0) {
          console.log(
            `[player-agent] p2p received=${poll.received} remembered=${poll.remembered} rejected=${poll.rejected}`,
          );
          for (const error of poll.errors.slice(0, 3)) {
            console.log(`[player-agent] p2p rejected: ${error}`);
          }
        }
      }

      if (useLlmLoop) {
        const result = await playerAgent.generate(nextTurnPrompt(turn), {
          maxSteps,
          toolCallConcurrency: 1,
          memory: {
            thread: threadId,
            resource: resourceId,
          },
          onStepFinish: ({ toolCalls, toolResults, finishReason }) => {
            if (toolCalls.length > 0) {
              console.log(
                `[player-agent] tools: ${toolCalls.map(toolCallName).join(', ')}`,
              );
            }

            if (toolResults.length > 0) {
              console.log(`[player-agent] tool results: ${toolResults.length}`);
            }

            console.log(`[player-agent] step finished: ${finishReason}`);
          },
        });

        console.log(result.text.trim() || '[player-agent] turn finished');
        if (p2p && !conversationEnabled && shouldBroadcastP2p(turn)) {
          const broadcasts = await p2p.broadcastAndRemember(
            result.text.trim() || `LLM turn ${turn} finished.`,
            {
              turnId: `autoplayer-${turn}`,
              channel: 'agent-chat',
            },
          );

          logP2pBroadcasts(broadcasts);
        }
      } else {
        if (shouldRefreshStrategy(turn)) {
          currentStrategy = await refreshEconomicStrategy(turn, currentStrategy);
          console.log(formatStrategy(currentStrategy));
        }

        const result = await client.runEconomicCycle({
          radius: currentStrategy.radius,
          maxForages: currentStrategy.maxForages,
          maxPickups: currentStrategy.maxPickups,
          maxMoveStepsPerTarget: currentStrategy.maxMoveStepsPerTarget,
          minEnergy: currentStrategy.minEnergy,
          sleepWhenLowEnergy: currentStrategy.sleepWhenLowEnergy,
          spawnIfMissing: true,
          worldObjectLookback: currentStrategy.worldObjectLookback,
          sellWhenValueAtLeast: currentStrategy.sellWhenValueAtLeast,
          sellWhenWeightRatioAtLeast: currentStrategy.sellWhenWeightRatioAtLeast,
          plantWhenSeedsAvailable: currentStrategy.plantWhenSeedsAvailable,
          harvestRadius: currentStrategy.harvestRadius,
          useLlmStrategyHint: currentStrategy.hint,
        });

        result.memory = await rememberEconomicCycle(result);

        console.log(formatEconomicCycle(result));
        if (p2p && !conversationEnabled && shouldBroadcastP2p(turn)) {
          const broadcasts = await p2p.broadcastAndRemember(
            formatP2pCycleMessage(result),
            {
              turnId: `autoplayer-${turn}`,
              channel: 'economic-cycle',
            },
          );

          logP2pBroadcasts(broadcasts);
        }
      }
    } catch (error) {
      console.error('[player-agent] turn failed:', formatError(error));
    }

    if (!stopping) {
      await sleep(turnDelayMs);
    }
  }

  if (conversationLoop) {
    await conversationLoop.stop();
  }

  console.log('[player-agent] autonomous loop stopped');
}

async function assertPlayerExecutorMatch(): Promise<void> {
  if (!requireMatchingPlayerAndExecutor) {
    return;
  }

  if (!process.env.AGENT_INFT_ADDRESS || !process.env.AGENT_TOKEN_ID) {
    return;
  }

  const inftClient = PantheonInftClient.fromEnv();
  const playerAddress = client.playerAddress.toLowerCase();
  const executorAddress = inftClient.executorAddress.toLowerCase();

  if (playerAddress !== executorAddress) {
    throw new Error(
      [
        'Player key and INFT executor key resolve to different addresses.',
        `player=${client.playerAddress}`,
        `executor=${inftClient.executorAddress}`,
        'Set MUD_PRIVATE_KEY and AGENT_EXECUTOR_PRIVATE_KEY to the same private key, or set PLAYER_AGENT_REQUIRE_EXECUTOR_MATCH=false to allow split keys.',
      ].join(' '),
    );
  }

  console.log(`[player-agent] player/executor address=${client.playerAddress}`);
}

function nextTurnPrompt(turn: number): string {
  return `Autonomous Pantheon expedition ${turn}.

Choose one mid-term tactical batch, then execute it with run-economic-cycle.
- Use primitive tools only if the batch result shows a specific blocker that needs inspection.
- Prefer one batched call with radius 4-6, maxForages 3-6, maxPickups 3-6, sellWhenValueAtLeast 40-80, and sleepWhenLowEnergy true.
- Summarize resources gained/sold, current CUC/inventory/energy/position, and the next strategic goal briefly.

Do not ask me for input. Use tools to act.`;
}

async function refreshEconomicStrategy(
  turn: number,
  previous: EconomicStrategy,
): Promise<EconomicStrategy> {
  const prompt = strategyPrompt(turn, previous);
  console.log(`[player-agent] strategy prompt turn=${turn}\n${prompt}`);

  try {
    const result = await strategyAgent.generate(prompt, {
      maxSteps: 1,
      toolChoice: 'none',
    });
    console.log(
      `[player-agent] strategy llm result turn=${turn}\n${result.text.trim()}`,
    );
    const parsed = parseStrategyResponse(result.text);

    return normalizeStrategy({
      ...previous,
      ...parsed,
      hint: parsed.hint || parsed.label || previous.hint,
    });
  } catch (error) {
    console.warn(`[player-agent] strategy refresh failed: ${formatError(error)}`);
    return previous;
  }
}

function strategyPrompt(turn: number, previous: EconomicStrategy): string {
  return `Pantheon strategy refresh for autonomous turn ${turn}.

Do not call tools. Return only compact JSON for the next ${llmEveryTurns || 10} deterministic economic-cycle turns.

Current strategy:
${JSON.stringify(previous)}

Choose values in these ranges:
- label: short human-readable strategy name
- radius: 1-8
- maxForages: 1-10
- maxPickups: 0-12
- maxMoveStepsPerTarget: 1-24
- minEnergy: 0-80
- sleepWhenLowEnergy: boolean
- worldObjectLookback: 1-400
- sellWhenValueAtLeast: 0-100000
- sellWhenWeightRatioAtLeast: 0-1
- plantWhenSeedsAvailable: boolean
- harvestRadius: 1-8
- hint: one short sentence explaining the tactical intent

Return JSON only.`;
}

function shouldRefreshStrategy(turn: number): boolean {
  return llmEveryTurns > 0 && turn > 0 && turn % llmEveryTurns === 0;
}

function shouldBroadcastP2p(turn: number): boolean {
  return p2pBroadcastEveryTurns > 0 && turn % p2pBroadcastEveryTurns === 0;
}

function readDefaultEconomicStrategy(): EconomicStrategy {
  return normalizeStrategy({
    label: 'default-economic-cycle',
    radius: readIntegerEnv('PLAYER_AGENT_RADIUS', 5),
    maxForages: readIntegerEnv('PLAYER_AGENT_MAX_FORAGES', 4),
    maxPickups: readIntegerEnv('PLAYER_AGENT_MAX_PICKUPS', 4),
    maxMoveStepsPerTarget: readIntegerEnv('PLAYER_AGENT_MAX_MOVE_STEPS', 10),
    minEnergy: readIntegerEnv('PLAYER_AGENT_MIN_ENERGY', 20),
    sleepWhenLowEnergy: readBooleanEnv('PLAYER_AGENT_SLEEP_WHEN_LOW_ENERGY', true),
    worldObjectLookback: readIntegerEnv('PLAYER_AGENT_WORLD_OBJECT_LOOKBACK', 80),
    sellWhenValueAtLeast: readIntegerEnv('PLAYER_AGENT_SELL_VALUE_THRESHOLD', 48),
    sellWhenWeightRatioAtLeast: readNumberEnv('PLAYER_AGENT_SELL_WEIGHT_RATIO', 0.75),
    plantWhenSeedsAvailable: readBooleanEnv('PLAYER_AGENT_PLANT_SEEDS', true),
    harvestRadius: readIntegerEnv('PLAYER_AGENT_HARVEST_RADIUS', 5),
    hint: 'Run a balanced gather, pickup, sell, farm, and rest loop.',
  });
}

function normalizeStrategy(input: Partial<EconomicStrategy>): EconomicStrategy {
  return {
    label: normalizeString(input.label, 'economic-cycle'),
    radius: clampInteger(input.radius, 1, 8, 5),
    maxForages: clampInteger(input.maxForages, 1, 10, 4),
    maxPickups: clampInteger(input.maxPickups, 0, 12, 4),
    maxMoveStepsPerTarget: clampInteger(input.maxMoveStepsPerTarget, 1, 24, 10),
    minEnergy: clampInteger(input.minEnergy, 0, 80, 20),
    sleepWhenLowEnergy: input.sleepWhenLowEnergy ?? true,
    worldObjectLookback: clampInteger(input.worldObjectLookback, 1, 400, 80),
    sellWhenValueAtLeast: clampInteger(input.sellWhenValueAtLeast, 0, 100_000, 48),
    sellWhenWeightRatioAtLeast: clampNumber(
      input.sellWhenWeightRatioAtLeast,
      0,
      1,
      0.75,
    ),
    plantWhenSeedsAvailable: input.plantWhenSeedsAvailable ?? true,
    harvestRadius: clampInteger(input.harvestRadius, 1, 8, 5),
    hint: normalizeString(
      input.hint,
      'Run a balanced gather, pickup, sell, farm, and rest loop.',
    ),
  };
}

function parseStrategyResponse(text: string): Partial<EconomicStrategy> {
  const trimmed = text.trim();
  const jsonText =
    trimmed.startsWith('{') && trimmed.endsWith('}')
      ? trimmed
      : trimmed.match(/\{[\s\S]*\}/)?.[0];

  if (!jsonText) {
    throw new Error('Strategy response did not contain JSON.');
  }

  const value = JSON.parse(jsonText);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Strategy response JSON was not an object.');
  }

  return value as Partial<EconomicStrategy>;
}

function formatMode(): string {
  if (useLlmLoop) return 'llm-every-turn';
  if (llmEveryTurns > 0) return `economic-cycle+strategy-every-${llmEveryTurns}`;
  return 'economic-cycle';
}

function formatStrategy(strategy: EconomicStrategy): string {
  return [
    `[player-agent] strategy=${strategy.label}`,
    `radius=${strategy.radius}`,
    `forages=${strategy.maxForages}`,
    `pickups=${strategy.maxPickups}`,
    `sellAt=${strategy.sellWhenValueAtLeast}`,
    `sleepBelow=${strategy.minEnergy}`,
    `plant=${strategy.plantWhenSeedsAvailable}`,
    `hint="${strategy.hint}"`,
  ].join(' ');
}

function normalizeString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;

  const trimmed = value.trim();
  return trimmed || fallback;
}

function clampInteger(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const parsed =
    typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsed)) return fallback;

  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const parsed =
    typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));

  if (!Number.isFinite(parsed)) return fallback;

  return Math.min(max, Math.max(min, parsed));
}

function readIntegerEnv(name: string, fallback: number): number {
  const value = process.env[name]?.trim();

  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function readNumberEnv(name: string, fallback: number): number {
  const value = process.env[name]?.trim();

  if (!value) return fallback;

  const parsed = Number.parseFloat(value);

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
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function formatEconomicCycle(result: Awaited<ReturnType<typeof client.runEconomicCycle>>): string {
  const player = result.player;
  const position = player ? `${player.x},${player.y}` : 'unknown';
  const energy = player ? `${player.energy}/${player.maxEnergy}` : 'unknown';
  const inventory = result.inventory
    ? `${result.inventory.usedWeight}/${result.inventory.maxWeight} weight, ${result.inventory.slots.length} slot(s)`
    : 'unknown inventory';
  const cuc = result.cucBalance ?? 'unknown';
  const gained = result.forages.length
    ? result.forages.map((forage) => `${forage.amount} ${forage.itemId}`).join(', ')
    : 'no forage';
  const picked = result.pickups.length
    ? result.pickups.map((pickup) => `${pickup.amount} ${pickup.itemId}`).join(', ')
    : 'no pickups';
  const sold = result.sale
    ? `sold ${result.sale.objectIds.length} object(s) for about ${result.sale.estimatedCuc} CUC`
    : 'no sale';

  return [
    `[player-agent] ${result.status}: ${result.summary}`,
    `[player-agent] decision=${result.decision} pos=${position} energy=${energy} cuc=${cuc} inventory=${inventory}`,
    `[player-agent] gained=${gained}; picked=${picked}; ${sold}`,
    formatMemoryStatus(result.memory),
    result.actions.length ? `[player-agent] actions: ${result.actions.join(' | ')}` : undefined,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

function formatP2pCycleMessage(
  result: Awaited<ReturnType<typeof client.runEconomicCycle>>,
): string {
  const player = result.player;
  const position = player ? `${player.x},${player.y}` : 'unknown';
  const energy = player ? `${player.energy}/${player.maxEnergy}` : 'unknown';
  const gained = result.forages.length
    ? result.forages.map((forage) => `${forage.amount} ${forage.itemId}`).join(', ')
    : 'no forage';
  const sold = result.sale
    ? `sold ${result.sale.objectIds.length} object(s) for about ${result.sale.estimatedCuc} CUC`
    : 'no sale';

  return `${result.status}: ${result.summary} Position ${position}, energy ${energy}, gained ${gained}, ${sold}.`;
}

function logP2pBroadcasts(broadcasts: P2pSendResult[]) {
  if (broadcasts.length === 0) return;

  const sent = broadcasts.filter((broadcast) => broadcast.sent).length;
  const remembered = broadcasts.filter((broadcast) => broadcast.remembered).length;
  const failed = broadcasts.length - sent;

  console.log(
    `[player-agent] p2p broadcast sent=${sent}/${broadcasts.length} remembered=${remembered} failed=${failed}`,
  );
  for (const broadcast of broadcasts.filter((item) => item.error).slice(0, 3)) {
    console.log(`[player-agent] p2p send failed peer=${broadcast.peerId}: ${broadcast.error}`);
  }
}

function formatMemoryStatus(
  memory: Awaited<ReturnType<typeof rememberEconomicCycle>> | undefined,
): string | undefined {
  if (!memory) return undefined;

  const parts = [`local=${memory.stored ? 'stored' : 'skipped'}`];

  if (memory.inft) {
    parts.push(`inft=${memory.inft.stored ? 'stored' : 'skipped'}`);
    if (memory.inft.uri) parts.push(`uri=${memory.inft.uri}`);
    if (memory.inft.txHash) parts.push(`appendTx=${memory.inft.txHash}`);
    if (memory.inft.intelligentData) {
      parts.push(
        `data=${memory.inft.intelligentData.description}:${memory.inft.intelligentData.updated ? 'updated' : 'not-updated'}`,
      );
      if (memory.inft.intelligentData.txHash) {
        parts.push(`dataTx=${memory.inft.intelligentData.txHash}`);
      }
    }
  }

  const reason = memory.inft?.intelligentData?.reason ?? memory.inft?.reason ?? memory.reason;
  if (reason) parts.push(`reason=${reason}`);

  return `[player-agent] memory ${parts.join(' ')}`;
}

async function rememberEconomicCycle(
  result: Awaited<ReturnType<typeof client.runEconomicCycle>>,
) {
  try {
    return await rememberForageExpedition(result, {
      threadId,
      resourceId,
      action: 'economic-cycle',
      turnId: `autoplayer-${Date.now()}`,
    });
  } catch (error) {
    return {
      stored: false,
      reason: `Memory unavailable: ${formatError(error)}`,
    };
  }
}

function toolCallName(call: unknown): string {
  if (typeof call === 'object' && call) {
    const maybeCall = call as { toolName?: string; toolCallId?: string; toolNameChunk?: string };

    return maybeCall.toolName ?? maybeCall.toolNameChunk ?? maybeCall.toolCallId ?? 'tool';
  }

  return 'tool';
}
