const agentId = process.env.PLAYER_AGENT_ID ?? 'pantheon-player-agent';
const mastraUrl = stripTrailingSlash(
  process.env.MASTRA_API_URL ?? 'http://localhost:4111',
);
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

await runStudioAutoplayer();

async function runStudioAutoplayer() {
  let turn = 0;

  console.log('[player-agent] Studio-backed autonomous loop started');
  console.log(`[player-agent] server=${mastraUrl} agent=${agentId}`);
  console.log(
    `[player-agent] delay=${turnDelayMs}ms maxTurns=${maxTurns || 'infinite'} maxSteps=${maxSteps}`,
  );

  while (!stopping && (maxTurns === 0 || turn < maxTurns)) {
    turn += 1;
    console.log(`\n[player-agent] turn ${turn}`);

    try {
      const response = await generateViaMastra(turn);
      console.log(response.text?.trim() || '[player-agent] turn finished');
      logToolActivity(response);
    } catch (error) {
      console.error('[player-agent] turn failed:', formatError(error));
    }

    if (!stopping) {
      await sleep(turnDelayMs);
    }
  }

  console.log('[player-agent] Studio-backed autonomous loop stopped');
}

async function generateViaMastra(turn: number): Promise<MastraGenerateResponse> {
  const response = await fetch(`${mastraUrl}/api/agents/${agentId}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: nextTurnPrompt(turn),
      maxSteps,
      memory: {
        thread: threadId,
        resource: resourceId,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mastra API ${response.status}: ${body}`);
  }

  return (await response.json()) as MastraGenerateResponse;
}

function logToolActivity(response: MastraGenerateResponse) {
  const toolNames = new Set<string>();

  for (const step of response.steps ?? []) {
    for (const call of step.toolCalls ?? []) {
      const name = toolCallName(call);
      if (name) toolNames.add(name);
    }
  }

  for (const call of response.toolCalls ?? []) {
    const name = toolCallName(call);
    if (name) toolNames.add(name);
  }

  if (toolNames.size > 0) {
    console.log(`[player-agent] tools: ${Array.from(toolNames).join(', ')}`);
  }
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

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function toolCallName(call: unknown): string | undefined {
  if (typeof call !== 'object' || !call) return undefined;

  const maybeCall = call as {
    toolName?: string;
    toolNameChunk?: string;
    toolCallId?: string;
    name?: string;
  };

  return maybeCall.toolName ?? maybeCall.toolNameChunk ?? maybeCall.name ?? maybeCall.toolCallId;
}

type MastraGenerateResponse = {
  text?: string;
  toolCalls?: unknown[];
  steps?: Array<{
    toolCalls?: unknown[];
  }>;
};

export {};
