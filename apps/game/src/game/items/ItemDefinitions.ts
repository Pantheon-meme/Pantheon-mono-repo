import { plantDefinitions } from "../plants/PlantDefinitions";

export type ItemCategory =
  | "crop"
  | "seed"
  | "fiber"
  | "wood"
  | "stone"
  | "ore"
  | "gem"
  | "mushroom"
  | "flower"
  | "reagent"
  | "shell";

export type ItemDefinition = {
  id: string;
  label: string;
  category: ItemCategory;
  color: number;
};

const categoryColors: Record<ItemCategory, number> = {
  crop: 0xf2d06b,
  seed: 0xd8a541,
  fiber: 0x8fd17d,
  wood: 0x9b6a3d,
  stone: 0x9ca3af,
  ore: 0xb78254,
  gem: 0x8ee8ff,
  mushroom: 0xd7a5ff,
  flower: 0xff8fd4,
  reagent: 0x91f2c3,
  shell: 0xf5e6c8,
};

const forageItems: ItemDefinition[] = [
  item("wild_fiber", "Wild fiber", "fiber"),
  item("violet_clover", "Violet clover", "flower", 0xbd8cff),
  item("pearl_dew", "Pearl dew", "reagent", 0xe8fff8),
  item("unicorn_petal", "Unicorn petal", "flower", 0xff9bd4),
  item("forest_root", "Forest root", "wood", 0x8a5b39),
  item("fee_moss_mushroom", "Fee moss mushroom", "mushroom", 0x96f2b7),
  item("fallen_unicorn_branch", "Fallen unicorn branch", "wood", 0xcdb7ff),
  item("bubble_moss", "Bubble moss", "reagent", 0x77dfc4),
  item("oracle_silt", "Oracle silt", "reagent", 0x5ea7a6),
  item("glassy_spore", "Glassy spore", "mushroom", 0xa7f3ff),
  item("pearl_shell", "Pearl shell", "shell"),
  item("lake_glass_pebble", "Lake glass pebble", "gem", 0x9de7ff),
  item("swapstone_dust", "Swapstone dust", "stone", 0xd18bc9),
  item("swapstone_pebble", "Swapstone pebble", "stone", 0xb59ac8),
  item("governance_stone_chip", "Governance stone chip", "stone", 0xa5a6bd),
  item("route_silk_fiber", "Route silk fiber", "fiber", 0xf5c6ff),
  item("marker_pebble", "Marker pebble", "stone", 0x96dbc6),
  item("oracle_glass_crystal", "Oracle glass crystal", "gem", 0xa7f3ff),
  item("copper_ore", "Copper ore", "ore", 0xc47a43),
  item("opal_gem", "Opal gem", "gem", 0xf3d7ff),
  item("mint_reed_fiber", "Mint reed fiber", "fiber", 0x8af2d0),
  item("pearl_moss", "Pearl moss", "reagent", 0xdff8e7),
  item("violet_mycela", "Violet mycela", "mushroom", 0xa986ff),
  item("glass_reed_shard", "Glass reed shard", "gem", 0xa7f3ff),
  item("liquidity_algae", "Liquidity algae", "reagent", 0x4fd3bb),
  item("rose_quartz_chip", "Rose quartz chip", "gem", 0xff9bd4),
  item("civic_clay", "Civic clay", "stone", 0xb6a8cf),
  item("route_thread_spool", "Route thread spool", "fiber", 0xf5c6ff),
  item("swamp_glass_nodule", "Swamp glass nodule", "gem", 0x66d4c9),
  item("oracle_amber", "Oracle amber", "gem", 0xf0bd67),
  item("pool_pearl", "Pool pearl", "shell", 0xe8fff8),
  item("moonlit_bark", "Moonlit bark", "wood", 0xbcc8e8),
];

export const itemDefinitions: Record<string, ItemDefinition> = {
  ...Object.fromEntries(
    Object.values(plantDefinitions).map((plant) => [
      plant.seedId,
      item(plant.seedId, plant.seedLabel, "seed", plant.colors.seed),
    ]),
  ),
  ...Object.fromEntries(
    Object.values(plantDefinitions).map((plant) => [
      `${plant.id}_harvest`,
      item(`${plant.id}_harvest`, plant.harvestLabel, "crop", plant.colors.grown),
    ]),
  ),
  ...Object.fromEntries(forageItems.map((definition) => [definition.id, definition])),
};

export function getItemDefinition(itemId: string): ItemDefinition | undefined {
  return itemDefinitions[itemId];
}

export function itemLabel(itemId: string): string {
  return getItemDefinition(itemId)?.label ?? formatItemId(itemId);
}

export function itemColor(itemId: string): number {
  const definition = getItemDefinition(itemId);

  return definition?.color ?? 0xf2d06b;
}

function item(
  id: string,
  label: string,
  category: ItemCategory,
  color = categoryColors[category],
): ItemDefinition {
  return { id, label, category, color };
}

function formatItemId(itemId: string): string {
  return itemId
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
