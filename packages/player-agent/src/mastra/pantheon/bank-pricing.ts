import type { BankItemPriceInput, BankItemQuoteSnapshot } from './mud-client';

export type BankPricedItem = {
  itemId: string;
  label: string;
  category:
    | 'crop'
    | 'seed'
    | 'fiber'
    | 'wood'
    | 'stone'
    | 'ore'
    | 'gem'
    | 'mushroom'
    | 'flower'
    | 'reagent'
    | 'shell';
  basePrice: number;
  targetInventory: number;
};

export type BankPriceDecision = BankItemPriceInput & {
  label: string;
  basePrice: number;
  targetInventory: number;
  inventoryQuantity: number;
  previousBuyPrice: bigint;
  previousSellPrice: bigint;
  changed: boolean;
  reason: string;
};

const categoryBasePrices: Record<BankPricedItem['category'], number> = {
  crop: 18,
  seed: 12,
  fiber: 14,
  wood: 18,
  stone: 16,
  ore: 34,
  gem: 64,
  mushroom: 24,
  flower: 20,
  reagent: 30,
  shell: 28,
};

const categoryTargets: Record<BankPricedItem['category'], number> = {
  crop: 40,
  seed: 36,
  fiber: 32,
  wood: 28,
  stone: 32,
  ore: 18,
  gem: 12,
  mushroom: 24,
  flower: 24,
  reagent: 18,
  shell: 18,
};

const specialBasePrices: Record<string, number> = {
  oracle_glass_crystal: 96,
  opal_gem: 110,
  oracle_amber: 88,
  pool_pearl: 78,
  rose_quartz_chip: 70,
  lake_glass_pebble: 56,
  swamp_glass_nodule: 62,
  glass_reed_shard: 54,
  copper_ore: 42,
  civic_clay: 24,
};

const forageItems: Array<Omit<BankPricedItem, 'basePrice' | 'targetInventory'>> = [
  { itemId: 'wild_fiber', label: 'Wild fiber', category: 'fiber' },
  { itemId: 'violet_clover', label: 'Violet clover', category: 'flower' },
  { itemId: 'pearl_dew', label: 'Pearl dew', category: 'reagent' },
  { itemId: 'unicorn_petal', label: 'Unicorn petal', category: 'flower' },
  { itemId: 'forest_root', label: 'Forest root', category: 'wood' },
  { itemId: 'fee_moss_mushroom', label: 'Fee moss mushroom', category: 'mushroom' },
  { itemId: 'fallen_unicorn_branch', label: 'Fallen unicorn branch', category: 'wood' },
  { itemId: 'bubble_moss', label: 'Bubble moss', category: 'reagent' },
  { itemId: 'oracle_silt', label: 'Oracle silt', category: 'reagent' },
  { itemId: 'glassy_spore', label: 'Glassy spore', category: 'mushroom' },
  { itemId: 'pearl_shell', label: 'Pearl shell', category: 'shell' },
  { itemId: 'lake_glass_pebble', label: 'Lake glass pebble', category: 'gem' },
  { itemId: 'swapstone_dust', label: 'Swapstone dust', category: 'stone' },
  { itemId: 'swapstone_pebble', label: 'Swapstone pebble', category: 'stone' },
  { itemId: 'governance_stone_chip', label: 'Governance stone chip', category: 'stone' },
  { itemId: 'route_silk_fiber', label: 'Route silk fiber', category: 'fiber' },
  { itemId: 'marker_pebble', label: 'Marker pebble', category: 'stone' },
  { itemId: 'oracle_glass_crystal', label: 'Oracle glass crystal', category: 'gem' },
  { itemId: 'copper_ore', label: 'Copper ore', category: 'ore' },
  { itemId: 'opal_gem', label: 'Opal gem', category: 'gem' },
  { itemId: 'mint_reed_fiber', label: 'Mint reed fiber', category: 'fiber' },
  { itemId: 'pearl_moss', label: 'Pearl moss', category: 'reagent' },
  { itemId: 'violet_mycela', label: 'Violet mycela', category: 'mushroom' },
  { itemId: 'glass_reed_shard', label: 'Glass reed shard', category: 'gem' },
  { itemId: 'liquidity_algae', label: 'Liquidity algae', category: 'reagent' },
  { itemId: 'rose_quartz_chip', label: 'Rose quartz chip', category: 'gem' },
  { itemId: 'civic_clay', label: 'Civic clay', category: 'stone' },
  { itemId: 'route_thread_spool', label: 'Route thread spool', category: 'fiber' },
  { itemId: 'swamp_glass_nodule', label: 'Swamp glass nodule', category: 'gem' },
  { itemId: 'oracle_amber', label: 'Oracle amber', category: 'gem' },
  { itemId: 'pool_pearl', label: 'Pool pearl', category: 'shell' },
  { itemId: 'moonlit_bark', label: 'Moonlit bark', category: 'wood' },
];

export const bankPricedItems: BankPricedItem[] = forageItems.map((item) => ({
  ...item,
  basePrice: specialBasePrices[item.itemId] ?? categoryBasePrices[item.category],
  targetInventory: categoryTargets[item.category],
}));

export function decideBankPrice(
  item: BankPricedItem,
  quote: BankItemQuoteSnapshot,
  epoch: number,
  validUntil: number,
): BankPriceDecision {
  const inventoryRatio = item.targetInventory === 0
    ? 1
    : quote.inventoryQuantity / item.targetInventory;
  const shortage = clamp(1 - inventoryRatio, 0, 1);
  const surplus = clamp(inventoryRatio - 1, 0, 2);
  const buyMultiplier = clamp(1 + shortage * 0.55 - surplus * 0.22, 0.55, 1.55);
  const sellMultiplier = clamp(1.28 + shortage * 0.45 - surplus * 0.12, 1.12, 2.1);
  const buyPrice = BigInt(Math.max(1, Math.round(item.basePrice * buyMultiplier)));
  const sellPrice = BigInt(
    Math.max(Number(buyPrice) + Math.ceil(item.basePrice * 0.18), Math.round(item.basePrice * sellMultiplier)),
  );
  const buyMaxQuantity = Math.max(
    1,
    Math.min(64, Math.ceil(item.targetInventory * (0.35 + shortage * 0.8))),
  );
  const sellMaxQuantity =
    quote.inventoryQuantity === 0 ? 1 : Math.max(1, Math.min(32, quote.inventoryQuantity));

  return {
    itemId: item.itemId,
    label: item.label,
    basePrice: item.basePrice,
    targetInventory: item.targetInventory,
    inventoryQuantity: quote.inventoryQuantity,
    previousBuyPrice: quote.buyPrice,
    previousSellPrice: quote.sellPrice,
    buyPrice,
    sellPrice,
    buyMaxQuantity,
    sellMaxQuantity,
    validUntil,
    epoch,
    changed:
      !quote.priceExists ||
      quote.buyPrice !== buyPrice ||
      quote.sellPrice !== sellPrice ||
      quote.buyMaxQuantity !== buyMaxQuantity ||
      quote.sellMaxQuantity !== sellMaxQuantity ||
      quote.epoch !== epoch ||
      quote.validUntil !== validUntil,
    reason: describePriceReason(quote.inventoryQuantity, item.targetInventory),
  };
}

function describePriceReason(quantity: number, target: number): string {
  if (quantity < target * 0.5) {
    return 'inventory is scarce, raising bank buy and sell pressure';
  }

  if (quantity > target * 1.25) {
    return 'inventory is stocked above target, softening prices';
  }

  return 'inventory is near target, keeping balanced prices';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
