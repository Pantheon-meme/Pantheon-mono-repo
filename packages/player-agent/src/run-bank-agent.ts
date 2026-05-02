import { bankAgent } from './mastra/agents/bank-agent';
import {
  executeBankPriceSync,
  readBankPricingStatus,
} from './mastra/tools/bank-tools';

const turnDelayMs = readIntegerEnv('BANK_AGENT_TURN_DELAY_MS', 30000);
const priceRefreshBufferSeconds = readIntegerEnv(
  'BANK_AGENT_PRICE_REFRESH_BUFFER_SECONDS',
  Math.max(300, Math.ceil((turnDelayMs * 2) / 1000)),
);
const maxTurns = readIntegerEnv('BANK_AGENT_MAX_TURNS', 0);
const maxSteps = readIntegerEnv('BANK_AGENT_MAX_STEPS', 3);
const threadId = process.env.BANK_AGENT_THREAD_ID ?? 'central-uni-bank';
const resourceId = process.env.BANK_AGENT_RESOURCE_ID ?? 'central-uni-bank';
const ensureAgentOnFirstTurn = readBooleanEnv('BANK_AGENT_ENSURE_AGENT', true);
const useLlmLoop = readBooleanEnv('BANK_AGENT_USE_LLM', false);

let stopping = false;

process.on('SIGINT', () => {
  stopping = true;
  console.log('\n[bank-agent] stopping after current turn...');
});

process.on('SIGTERM', () => {
  stopping = true;
});

await runBankAgent();

async function runBankAgent() {
  let turn = 0;
  let lastInventorySignature: string | undefined;

  console.log('[bank-agent] autonomous pricing loop started');
  console.log(
    `[bank-agent] checkDelay=${turnDelayMs}ms priceRefreshBuffer=${priceRefreshBufferSeconds}s maxTurns=${maxTurns || 'infinite'} mode=${useLlmLoop ? 'llm' : 'inventory-watch'} maxSteps=${maxSteps}`,
  );

  while (!stopping && (maxTurns === 0 || turn < maxTurns)) {
    try {
      if (useLlmLoop) {
        turn += 1;
        console.log(`\n[bank-agent] turn ${turn}`);
        await runLlmTurn(turn);
      } else {
        const pricingStatus = await readBankPricingStatus(priceRefreshBufferSeconds);
        const inventorySignature = pricingStatus.inventorySignature;
        const inventoryChanged =
          lastInventorySignature !== undefined &&
          inventorySignature !== lastInventorySignature;
        const needsPriceRefresh = pricingStatus.stalePriceCount > 0;
        const shouldSync =
          lastInventorySignature === undefined ||
          inventoryChanged ||
          needsPriceRefresh;

        if (!shouldSync) {
          const expiryDetail = pricingStatus.nextExpiresAt
            ? ` next price ${pricingStatus.nextExpiringItemId} expires at ${pricingStatus.nextExpiresAt}`
            : ' no expiring prices';

          console.log(
            `[bank-agent] inventory unchanged and prices fresh;${expiryDetail}; waiting ${turnDelayMs}ms before next check`,
          );
        } else {
          turn += 1;
          console.log(`\n[bank-agent] turn ${turn}`);
          logDirectSyncReason({
            lastInventorySignature,
            inventoryChanged,
            pricingStatus,
          });
          await runDirectTurn(turn);
          lastInventorySignature = inventorySignature;
        }
      }
    } catch (error) {
      console.error('[bank-agent] turn failed:', formatError(error));
    }

    if (!stopping) {
      await sleep(turnDelayMs);
    }
  }

  console.log('[bank-agent] autonomous pricing loop stopped');
}

function logDirectSyncReason({
  lastInventorySignature,
  inventoryChanged,
  pricingStatus,
}: {
  lastInventorySignature: string | undefined;
  inventoryChanged: boolean;
  pricingStatus: Awaited<ReturnType<typeof readBankPricingStatus>>;
}): void {
  if (lastInventorySignature === undefined) {
    console.log('[bank-agent] initial inventory snapshot detected; syncing prices');
    return;
  }

  if (inventoryChanged) {
    console.log('[bank-agent] bank inventory changed; syncing prices');
    return;
  }

  const examples = pricingStatus.staleItemIds.slice(0, 5).join(', ');
  const suffix =
    pricingStatus.staleItemIds.length > 5
      ? `, ...and ${pricingStatus.staleItemIds.length - 5} more`
      : '';

  console.log(
    `[bank-agent] ${pricingStatus.stalePriceCount} price(s) missing, expired, or near expiry by ${pricingStatus.refreshBy}; syncing prices${examples ? ` (${examples}${suffix})` : ''}`,
  );
}

async function runDirectTurn(turn: number): Promise<void> {
  const ensureAgent = turn === 1 && ensureAgentOnFirstTurn;

  console.log(
    `[bank-agent] syncing prices directly ensureAgent=${ensureAgent} validForSeconds=1800 maxUpdates=256`,
  );
  const result = await executeBankPriceSync({
    postPrices: true,
    ensureAgent,
    validForSeconds: 1800,
    maxUpdates: 256,
  });

  logBankSync(result);
  console.log('[bank-agent] direct sync finished');
}

async function runLlmTurn(turn: number): Promise<void> {
  const result = await bankAgent.generate(nextTurnPrompt(turn), {
    maxSteps,
    toolCallConcurrency: 1,
    memory: {
      thread: threadId,
      resource: resourceId,
    },
    onStepFinish: ({ toolCalls, toolResults, finishReason }) => {
      if (toolCalls.length > 0) {
        console.log(
          `[bank-agent] tools: ${toolCalls.map(toolCallName).join(', ')}`,
        );
      }

      if (toolResults.length > 0) {
        console.log(`[bank-agent] tool results: ${toolResults.length}`);
        logBankSyncResults(toolResults);
      }

      console.log(`[bank-agent] step finished: ${finishReason}`);
    },
  });

  console.log(result.text.trim() || '[bank-agent] turn finished');
}

function nextTurnPrompt(turn: number): string {
  const ensureAgent = turn === 1 && ensureAgentOnFirstTurn;

  return `Central Uni Bank pricing cycle ${turn}.

Run sync-bank-prices with postPrices=true, ensureAgent=${ensureAgent}, validForSeconds=1800, maxUpdates=256.
Summarize posted price updates and current inventory pressure briefly.
Do not ask me for input. Use tools to act.`;
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

  return ['1', 'true', 'yes', 'y'].includes(value);
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

type BankSyncDecisionLog = {
  itemId: string;
  label: string;
  basePrice: number;
  targetInventory: number;
  inventoryQuantity: number;
  previousBuyPrice: string;
  previousSellPrice: string;
  buyPrice: string;
  sellPrice: string;
  buyMaxQuantity: number;
  sellMaxQuantity: number;
  changed: boolean;
  reason: string;
};

type BankSyncResultLog = {
  postPrices: boolean;
  epoch: number;
  validUntil: number;
  itemCount: number;
  changedCount: number;
  postedCount: number;
  transactions: Array<{ itemId: string; hash: string }>;
  decisions: BankSyncDecisionLog[];
};

function logBankSyncResults(toolResults: unknown[]): void {
  for (const toolResult of toolResults) {
    const sync = findBankSyncResult(toolResult);

    if (!sync) {
      continue;
    }

    logBankSync(sync);
  }
}

function logBankSync(sync: BankSyncResultLog): void {
  const changed = sync.decisions.filter((decision) => decision.changed);
  const scarce = [...sync.decisions]
    .sort((a, b) => inventoryPressure(b) - inventoryPressure(a))
    .slice(0, 5);
  const postedByItem = new Map(
    sync.transactions.map((transaction) => [transaction.itemId, transaction.hash]),
  );

  console.log(
    `[bank-agent] price sync: items=${sync.itemCount} changed=${sync.changedCount} posted=${sync.postedCount} validUntil=${sync.validUntil}`,
  );

  if (scarce.length > 0) {
    console.log('[bank-agent] strongest inventory pressure:');
    console.table(
      scarce.map((decision) => ({
        item: decision.itemId,
        inventory: `${decision.inventoryQuantity}/${decision.targetInventory}`,
        buy: decision.buyPrice,
        sell: decision.sellPrice,
        reason: decision.reason,
      })),
    );
  }

  if (changed.length === 0) {
    console.log('[bank-agent] prices already fresh; no changes posted.');
    return;
  }

  console.log('[bank-agent] changed prices:');
  console.table(
    changed.slice(0, 20).map((decision) => ({
      item: decision.itemId,
      inventory: `${decision.inventoryQuantity}/${decision.targetInventory}`,
      buy: `${decision.previousBuyPrice} -> ${decision.buyPrice}`,
      sell: `${decision.previousSellPrice} -> ${decision.sellPrice}`,
      maxBuy: decision.buyMaxQuantity,
      maxSell: decision.sellMaxQuantity,
      posted: postedByItem.has(decision.itemId) ? 'yes' : 'no',
      reason: decision.reason,
    })),
  );

  if (changed.length > 20) {
    console.log(`[bank-agent] ...and ${changed.length - 20} more changed prices.`);
  }

  if (sync.transactions.length > 0) {
    console.log('[bank-agent] posted transactions:');
    for (const transaction of sync.transactions) {
      console.log(`[bank-agent]   ${transaction.itemId}: ${transaction.hash}`);
    }
  }
}

function inventoryPressure(decision: BankSyncDecisionLog): number {
  if (decision.targetInventory <= 0) {
    return 0;
  }

  return Math.max(0, 1 - decision.inventoryQuantity / decision.targetInventory);
}

function findBankSyncResult(value: unknown): BankSyncResultLog | undefined {
  if (isBankSyncResult(value)) {
    return value;
  }

  if (!value || typeof value !== 'object') {
    return undefined;
  }

  for (const nested of Object.values(value as Record<string, unknown>)) {
    const result = findBankSyncResult(nested);

    if (result) {
      return result;
    }
  }

  return undefined;
}

function isBankSyncResult(value: unknown): value is BankSyncResultLog {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybe = value as Partial<BankSyncResultLog>;

  return (
    typeof maybe.itemCount === 'number' &&
    typeof maybe.changedCount === 'number' &&
    typeof maybe.postedCount === 'number' &&
    Array.isArray(maybe.decisions) &&
    Array.isArray(maybe.transactions)
  );
}

function toolCallName(call: unknown): string {
  if (typeof call === 'object' && call) {
    const maybeCall = call as { toolName?: string; toolCallId?: string; toolNameChunk?: string };

    return maybeCall.toolName ?? maybeCall.toolNameChunk ?? maybeCall.toolCallId ?? 'tool';
  }

  return 'tool';
}
