import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  bankPricedItems,
  decideBankPrice,
  type BankPriceDecision,
} from '../pantheon/bank-pricing';
import { makePantheonMudClient } from '../pantheon/mud-client';

const client = makePantheonMudClient({
  privateKeyEnv: 'BANK_AGENT_MUD_PRIVATE_KEY',
});

export type BankPriceSyncOptions = {
  postPrices?: boolean;
  ensureAgent?: boolean;
  validForSeconds?: number;
  maxUpdates?: number;
};

export type BankPricingStatus = {
  inventorySignature: string;
  itemCount: number;
  stalePriceCount: number;
  staleItemIds: string[];
  nextExpiringItemId?: string;
  nextExpiresAt?: number;
  refreshBy: number;
  chainTimestamp: number;
};

export const getBankStateTool = createTool({
  id: 'get-bank-state',
  description: 'Read Central Uni Bank item inventory and current onchain buy/sell prices.',
  inputSchema: z.object({}),
  outputSchema: z.unknown(),
  execute: async () => {
    const quotes = await client.getBankItemQuotes(bankPricedItems.map((item) => item.itemId));

    return {
      itemCount: bankPricedItems.length,
      quotes: quotes.map((quote) => ({
        ...quote,
        buyPrice: quote.buyPrice.toString(),
        sellPrice: quote.sellPrice.toString(),
      })),
    };
  },
});

export const ensureBankAgentTool = createTool({
  id: 'ensure-bank-agent',
  description:
    'Set the current wallet as the Central Uni Bank price-setting agent. Requires terrain admin authority.',
  inputSchema: z.object({}),
  outputSchema: z.unknown(),
  execute: async () => client.setBankAgent(),
});

export async function readBankInventorySignature(): Promise<string> {
  return (await readBankPricingStatus()).inventorySignature;
}

export async function readBankPricingStatus(
  refreshBufferSeconds = 0,
): Promise<BankPricingStatus> {
  const quotes = await client.getBankItemQuotes(bankPricedItems.map((item) => item.itemId));
  const chainTimestamp = await client.getChainTimestamp();
  const refreshBy = chainTimestamp + Math.max(0, refreshBufferSeconds);
  const expiringQuotes = quotes
    .filter((quote) => quote.priceExists && quote.validUntil > 0)
    .sort((a, b) => a.validUntil - b.validUntil);
  const staleItemIds = quotes
    .filter(
      (quote) =>
        !quote.priceExists ||
        (quote.validUntil > 0 && quote.validUntil <= refreshBy),
    )
    .map((quote) => quote.itemId)
    .sort();

  return {
    inventorySignature: quotes
      .map((quote) => `${quote.itemId}:${quote.inventoryQuantity}`)
      .sort()
      .join('|'),
    itemCount: quotes.length,
    stalePriceCount: staleItemIds.length,
    staleItemIds,
    nextExpiringItemId: expiringQuotes[0]?.itemId,
    nextExpiresAt: expiringQuotes[0]?.validUntil,
    refreshBy,
    chainTimestamp,
  };
}

export const syncBankPricesTool = createTool({
  id: 'sync-bank-prices',
  description:
    'Read bank inventory, compute buy/sell prices for every known bank item, and post changed prices onchain.',
  inputSchema: z.object({
    postPrices: z.boolean().default(true),
    ensureAgent: z.boolean().default(false),
    validForSeconds: z.number().int().min(60).max(86_400).default(1800),
    maxUpdates: z.number().int().min(1).max(256).default(256),
  }),
  outputSchema: z.unknown(),
  execute: async ({ postPrices, ensureAgent, validForSeconds, maxUpdates }) =>
    executeBankPriceSync({ postPrices, ensureAgent, validForSeconds, maxUpdates }),
});

export const bankTools = {
  getBankStateTool,
  ensureBankAgentTool,
  syncBankPricesTool,
};

function serializeDecision(decision: BankPriceDecision) {
  return {
    ...decision,
    buyPrice: decision.buyPrice.toString(),
    sellPrice: decision.sellPrice.toString(),
    previousBuyPrice: decision.previousBuyPrice.toString(),
    previousSellPrice: decision.previousSellPrice.toString(),
  };
}

export async function executeBankPriceSync({
  postPrices,
  ensureAgent,
  validForSeconds,
  maxUpdates,
}: BankPriceSyncOptions = {}) {
  const shouldPostPrices = postPrices ?? true;
  const shouldEnsureAgent = ensureAgent ?? false;
  const priceValiditySeconds = validForSeconds ?? 1800;
  const updateLimit = maxUpdates ?? 256;

  if (shouldEnsureAgent) {
    await client.setBankAgent();
  }

  const epoch = await client.getChainTimestamp();
  const validUntil = epoch + priceValiditySeconds;
  const quotes = await client.getBankItemQuotes(bankPricedItems.map((item) => item.itemId));
  const quoteByItemId = new Map(quotes.map((quote) => [quote.itemId, quote]));
  const decisions = bankPricedItems.map((item) =>
    decideBankPrice(item, quoteByItemId.get(item.itemId)!, epoch, validUntil),
  );
  const changedDecisions = decisions.filter((decision) => decision.changed);
  const updates = changedDecisions.slice(0, updateLimit);
  const transactions = [];

  if (shouldPostPrices) {
    for (const decision of updates) {
      const result = await client.setBankItemPrice(decision);
      transactions.push({ itemId: decision.itemId, hash: result.hash });
    }
  }

  return {
    postPrices: shouldPostPrices,
    epoch,
    validUntil,
    itemCount: decisions.length,
    changedCount: changedDecisions.length,
    postedCount: transactions.length,
    transactions,
    decisions: decisions.map(serializeDecision),
  };
}
