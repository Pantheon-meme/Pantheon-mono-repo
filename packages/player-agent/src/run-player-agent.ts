import { playerAgent } from './mastra/agents/player-agent';

const turnDelayMs = readIntegerEnv('PLAYER_AGENT_TURN_DELAY_MS', 5000);
const maxTurns = readIntegerEnv('PLAYER_AGENT_MAX_TURNS', 0);
const maxSteps = readIntegerEnv('PLAYER_AGENT_MAX_STEPS', 8);
const threadId = process.env.PLAYER_AGENT_THREAD_ID ?? 'pantheon-autoplayer';
const resourceId = process.env.PLAYER_AGENT_RESOURCE_ID ?? 'pantheon-player';

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
    `[player-agent] delay=${turnDelayMs}ms maxTurns=${maxTurns || 'infinite'} maxSteps=${maxSteps}`,
  );

  while (!stopping && (maxTurns === 0 || turn < maxTurns)) {
    turn += 1;
    console.log(`\n[player-agent] turn ${turn}`);

    try {
      const result = await playerAgent.generate(nextTurnPrompt(turn), {
        maxSteps,
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
  return `Autonomous Pantheon turn ${turn}.

Take exactly one useful game turn:
- Read player state.
- Spawn if missing.
- Resolve ready pending actions before anything else.
- If energy is low, start or wait on sleep.
- Otherwise scan nearby lands, move toward the best forage opportunity, and forage when close enough.
- Learn from forage results and explain the next intended move briefly.

Do not ask me for input. Use tools to act.`;
}

function readIntegerEnv(name: string, fallback: number): number {
  const value = process.env[name]?.trim();

  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : fallback;
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

function toolCallName(call: unknown): string {
  if (typeof call === 'object' && call) {
    const maybeCall = call as { toolName?: string; toolCallId?: string; toolNameChunk?: string };

    return maybeCall.toolName ?? maybeCall.toolNameChunk ?? maybeCall.toolCallId ?? 'tool';
  }

  return 'tool';
}
