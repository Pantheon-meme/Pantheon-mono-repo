import { playerAgent } from './mastra/agents/player-agent';
import { rememberForageExpedition } from './mastra/agents/player-memory';
import { makePantheonMudClient } from './mastra/pantheon/mud-client';

const turnDelayMs = readIntegerEnv('PLAYER_AGENT_TURN_DELAY_MS', 5000);
const maxTurns = readIntegerEnv('PLAYER_AGENT_MAX_TURNS', 0);
const maxSteps = readIntegerEnv('PLAYER_AGENT_MAX_STEPS', 6);
const threadId = process.env.PLAYER_AGENT_THREAD_ID ?? 'pantheon-autoplayer';
const resourceId = process.env.PLAYER_AGENT_RESOURCE_ID ?? 'pantheon-player';
const useLlmLoop = readBooleanEnv('PLAYER_AGENT_USE_LLM', false);
const llmEveryTurns = readIntegerEnv('PLAYER_AGENT_LLM_EVERY_TURNS', 0);
const client = makePantheonMudClient();

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

  console.log('[player-agent] autonomous loop started');
  console.log(
    `[player-agent] delay=${turnDelayMs}ms maxTurns=${maxTurns || 'infinite'} mode=${useLlmLoop ? 'llm' : 'economic-cycle'} maxSteps=${maxSteps}`,
  );

  while (!stopping && (maxTurns === 0 || turn < maxTurns)) {
    turn += 1;
    console.log(`\n[player-agent] turn ${turn}`);

    try {
      if (!useLlmLoop && (llmEveryTurns <= 0 || turn % llmEveryTurns !== 0)) {
        const result = await client.runEconomicCycle({
          radius: readIntegerEnv('PLAYER_AGENT_RADIUS', 5),
          maxForages: readIntegerEnv('PLAYER_AGENT_MAX_FORAGES', 4),
          maxPickups: readIntegerEnv('PLAYER_AGENT_MAX_PICKUPS', 4),
          maxMoveStepsPerTarget: readIntegerEnv('PLAYER_AGENT_MAX_MOVE_STEPS', 10),
          minEnergy: readIntegerEnv('PLAYER_AGENT_MIN_ENERGY', 20),
          sleepWhenLowEnergy: readBooleanEnv('PLAYER_AGENT_SLEEP_WHEN_LOW_ENERGY', true),
          spawnIfMissing: true,
          worldObjectLookback: readIntegerEnv('PLAYER_AGENT_WORLD_OBJECT_LOOKBACK', 80),
          sellWhenValueAtLeast: readIntegerEnv('PLAYER_AGENT_SELL_VALUE_THRESHOLD', 48),
          sellWhenWeightRatioAtLeast: readNumberEnv('PLAYER_AGENT_SELL_WEIGHT_RATIO', 0.75),
          plantWhenSeedsAvailable: readBooleanEnv('PLAYER_AGENT_PLANT_SEEDS', true),
          harvestRadius: readIntegerEnv('PLAYER_AGENT_HARVEST_RADIUS', 5),
        });

        result.memory = await rememberEconomicCycle(result);

        console.log(formatEconomicCycle(result));
      } else {
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
      }
    } catch (error) {
      console.error('[player-agent] turn failed:', formatError(error));
    }

    if (!stopping) {
      await sleep(turnDelayMs);
    }
  }

  console.log('[player-agent] autonomous loop stopped');
}

function nextTurnPrompt(turn: number): string {
  return `Autonomous Pantheon expedition ${turn}.

Choose one mid-term tactical batch, then execute it with run-economic-cycle.
- Use primitive tools only if the batch result shows a specific blocker that needs inspection.
- Prefer one batched call with radius 4-6, maxForages 3-6, maxPickups 3-6, sellWhenValueAtLeast 40-80, and sleepWhenLowEnergy true.
- Summarize resources gained/sold, current CUC/inventory/energy/position, and the next strategic goal briefly.

Do not ask me for input. Use tools to act.`;
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
    result.actions.length ? `[player-agent] actions: ${result.actions.join(' | ')}` : undefined,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

async function rememberEconomicCycle(
  result: Awaited<ReturnType<typeof client.runEconomicCycle>>,
) {
  try {
    return await rememberForageExpedition(result, {
      threadId,
      resourceId,
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
