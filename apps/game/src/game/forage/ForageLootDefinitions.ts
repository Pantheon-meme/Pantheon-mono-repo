export type ForageLootSlotDefinition = {
  itemId: string;
  weight: number;
  minAmount?: number;
  maxAmount?: number;
};

export type TerrainForageDefinition = {
  terrainId: string;
  tableId: string;
  baseChance: number;
  loot: ForageLootSlotDefinition[];
};

export const terrainForageDefinitions: TerrainForageDefinition[] = [
  {
    terrainId: "vibrant-grass",
    tableId: "meadow_grass_forage",
    baseChance: 4000,
    loot: [
      loot("sungrain_seed", 26),
      loot("emberwheat_seed", 16),
      loot("wild_fiber", 18),
      loot("violet_clover", 14),
      loot("applewood_seed", 10),
      loot("pinecrest_seed", 9),
      loot("honeyfig_seed", 4),
      loot("opal_gem", 1),
    ],
  },
  {
    terrainId: "plain",
    tableId: "plain_forage",
    baseChance: 2800,
    loot: [
      loot("city_clover_seed", 24),
      loot("routeberry_seed", 16),
      loot("pearl_dew", 18),
      loot("wild_fiber", 14),
      loot("marker_pebble", 10),
      loot("violet_clover", 10),
      loot("opal_gem", 1),
    ],
  },
  {
    terrainId: "grass",
    tableId: "grass_forage",
    baseChance: 4500,
    loot: [
      loot("city_clover_seed", 18),
      loot("routeberry_seed", 18),
      loot("violet_clover", 20),
      loot("unicorn_petal", 12),
      loot("tickbloom_seed", 7),
      loot("starblossom_seed", 3),
      loot("opal_gem", 1),
    ],
  },
  {
    terrainId: "forest-floor",
    tableId: "forest_forage",
    baseChance: 6500,
    loot: [
      loot("forest_root", 20),
      loot("fee_moss_mushroom", 17),
      loot("fallen_unicorn_branch", 15),
      loot("unicornwillow_seed", 12),
      loot("tickbloom_seed", 10),
      loot("starblossom_seed", 8),
      loot("moonwillow_seed", 5),
      loot("poolcypress_seed", 2),
      loot("opal_gem", 1),
    ],
  },
  {
    terrainId: "dirt",
    tableId: "dirt_forage",
    baseChance: 4000,
    loot: [
      loot("routeberry_seed", 18),
      loot("city_clover_seed", 18),
      loot("swamp_orchid_seed", 8),
      loot("swapstone_dust", 18),
      loot("pink_thistle_seed", 8),
      loot("copper_ore", 4),
      loot("opal_gem", 1),
    ],
  },
  {
    terrainId: "sand",
    tableId: "sand_forage",
    baseChance: 4200,
    loot: [
      loot("pearl_shell", 24),
      loot("liquidity_reed_seed", 18),
      loot("poolblossom_seed", 12),
      loot("lake_glass_pebble", 12),
      loot("pearl_dew", 10),
      loot("mirror_reed_seed", 4),
      loot("opal_gem", 1),
    ],
  },
  {
    terrainId: "stone",
    tableId: "stone_forage",
    baseChance: 3200,
    loot: [
      loot("swapstone_pebble", 25),
      loot("governance_stone_chip", 18),
      loot("marker_pebble", 14),
      loot("stonepine_seed", 8),
      loot("copper_ore", 8),
      loot("oracle_glass_crystal", 3),
      loot("opal_gem", 2),
    ],
  },
  {
    terrainId: "swamp",
    tableId: "swamp_forage",
    baseChance: 6200,
    loot: [
      loot("swamp_orchid_seed", 20),
      loot("mirror_reed_seed", 14),
      loot("bubble_moss", 18),
      loot("oracle_silt", 14),
      loot("glassy_spore", 12),
      loot("moonwillow_seed", 7),
      loot("poolcypress_seed", 3),
      loot("oracle_glass_crystal", 2),
      loot("opal_gem", 1),
    ],
  },
  {
    terrainId: "water",
    tableId: "water_forage",
    baseChance: 4200,
    loot: [
      loot("poolblossom_seed", 20),
      loot("liquidity_reed_seed", 20),
      loot("mirror_reed_seed", 8),
      loot("pearl_dew", 18),
      loot("lake_glass_pebble", 8),
      loot("poolcypress_seed", 3),
      loot("opal_gem", 1),
    ],
  },
  {
    terrainId: "path",
    tableId: "path_forage",
    baseChance: 3000,
    loot: [
      loot("route_silk_fiber", 24),
      loot("routeberry_seed", 20),
      loot("city_clover_seed", 14),
      loot("marker_pebble", 14),
      loot("swapstone_dust", 8),
      loot("opal_gem", 1),
    ],
  },
];

export function getTerrainForageDefinition(
  terrainId: string,
): TerrainForageDefinition | undefined {
  return terrainForageDefinitions.find(
    (definition) => definition.terrainId === terrainId,
  );
}

function loot(
  itemId: string,
  weight: number,
  minAmount = 1,
  maxAmount = 1,
): ForageLootSlotDefinition {
  return { itemId, weight, minAmount, maxAmount };
}
