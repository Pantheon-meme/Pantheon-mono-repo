import type { TerrainAtlasAssetId } from "../../assets/autotiles/TerrainAtlasAssets";

export type TerrainGenerationPrompt = {
  material: string;
  texturePrompt: string;
  stylePrompt: string;
  sampleStyleAtlasId?: TerrainAtlasAssetId;
};

export type BiomeTerrainDefinition = {
  id: string;
  label: string;
  atlasId: TerrainAtlasAssetId;
  texturePrefix: string;
  stackOrder: number;
  cursorColor?: number;
  placement:
    | {
        kind: "background";
      }
    | {
        kind: "empty";
      }
    | {
        kind: "patches";
        seedOffset: number;
        frequency: number;
        threshold: number;
        avoidSpawnRadius?: number;
      };
  generation: TerrainGenerationPrompt;
};

export type BiomePlantSpawnDefinition = {
  plantId: string;
  role: "crop" | "tree" | "landmark";
  abundance: "common" | "uncommon" | "rare" | "signature";
  notes: string;
};

export type BiomeObjectDefinition = {
  id: string;
  label: string;
  role: "gathering-place" | "resource" | "decoration" | "landmark";
  footprintTiles: {
    width: number;
    height: number;
  };
  visual: {
    spriteSheetId: string;
    row: number;
    column: number;
    scale: number;
    groundOriginY?: number;
  };
  placement: {
    kind: "spawn-ring" | "path-edge" | "pool-edge" | "grove-edge" | "scattered";
    count: number;
    minSpawnDistance?: number;
    maxSpawnDistance?: number;
    seedOffset: number;
    regionIds?: string[];
    terrainIds?: string[];
  };
  generation: {
    objectBrief: string;
    stylePrompt: string;
  };
};

export type BiomeRegionDefinition = {
  id: string;
  label: string;
  description: string;
  anchor: {
    xRatio: number;
    yRatio: number;
  };
  radiusTiles: number;
  terrains: Array<{
    terrainId: string;
    weight: number;
    notes?: string;
  }>;
  plants: Array<{
    plantId: string;
    weight: number;
    terrainIds?: string[];
    notes?: string;
  }>;
  objects: Array<{
    objectId: string;
    weight: number;
    terrainIds?: string[];
    notes?: string;
  }>;
  connections: string[];
};

export type BiomeDefinition = {
  id: string;
  label: string;
  subtitle: string;
  description: string;
  baseLayer: {
    baseColor: number;
    variantColor: number;
    shadowColor: number;
  };
  backgroundTerrainId: string;
  digTerrainId: string;
  terrains: BiomeTerrainDefinition[];
  plants: BiomePlantSpawnDefinition[];
  objects: BiomeObjectDefinition[];
  regions: BiomeRegionDefinition[];
  worldGeneration: {
    seed: number;
    spawnClearingRadius: number;
    treePlantIds: string[];
  };
};

const calmerTerrainTextureDirection =
  "use larger 2x-scale readable shapes, fewer tiny repeated flecks, lower micro-detail density, clear quiet negative space for characters and objects";

const calmerTerrainStyleDirection =
  "larger readable motifs, low visual noise, no speckled carpet texture";

function calmerTerrainTexture(texturePrompt: string): string {
  return `${texturePrompt}; ${calmerTerrainTextureDirection}`;
}

function calmerTerrainStyle(stylePrompt: string): string {
  return `${stylePrompt}, ${calmerTerrainStyleDirection}`;
}

function uniswapTerrain(
  id: string,
  label: string,
  atlasId: TerrainAtlasAssetId,
  stackOrder: number,
  placementKind: "background" | "patches",
  seedOffset: number,
  material: string,
  texturePrompt: string,
  sampleStyleAtlasId: TerrainAtlasAssetId,
  options: {
    frequency?: number;
    threshold?: number;
    avoidSpawnRadius?: number;
    cursorColor?: number;
  } = {},
): BiomeTerrainDefinition {
  return {
    id,
    label,
    atlasId,
    texturePrefix: atlasId,
    stackOrder,
    cursorColor: options.cursorColor,
    placement:
      placementKind === "background"
        ? { kind: "background" }
        : {
            kind: "patches",
            seedOffset,
            frequency: options.frequency ?? 0.06,
            threshold: options.threshold ?? 0.66,
            avoidSpawnRadius: options.avoidSpawnRadius ?? 5,
          },
    generation: {
      material,
      texturePrompt: calmerTerrainTexture(texturePrompt),
      stylePrompt: calmerTerrainStyle(
        "cozy hand-painted 2D game terrain, top-down, crisp dual-grid autotile readability, no logos, no text",
      ),
      sampleStyleAtlasId,
    },
  };
}

function biomeObject(
  id: string,
  label: string,
  role: BiomeObjectDefinition["role"],
  width: number,
  height: number,
  spriteSheetId: string,
  row: number,
  column: number,
  scale: number,
  placementKind: BiomeObjectDefinition["placement"]["kind"],
  count: number,
  seedOffset: number,
  regionIds: string[],
  terrainIds: string[],
  groundOriginY?: number,
): BiomeObjectDefinition {
  return {
    id,
    label,
    role,
    footprintTiles: { width, height },
    visual: { spriteSheetId, row, column, scale, groundOriginY },
    placement: {
      kind: placementKind,
      count,
      minSpawnDistance: placementKind === "spawn-ring" ? 0 : 5,
      maxSpawnDistance: placementKind === "spawn-ring" ? 0 : 64,
      seedOffset,
      regionIds,
      terrainIds,
    },
    generation: {
      objectBrief: `${label}, Uniswap-inspired biome object for ${terrainIds.join(", ")} terrain.`,
      stylePrompt:
        "cozy hand-painted 2D biome prop, transparent background, readable top-down object, no text, no logos",
    },
  };
}

export const biomeDefinitions: Record<string, BiomeDefinition> = {
  meadow: {
    id: "meadow",
    label: "First Meadow",
    subtitle: "Soft grass, workable dirt, and young groves.",
    description:
      "The default living meadow: readable terrain, gentle groves, and room for the first farmstead.",
    baseLayer: {
      baseColor: 0x496f50,
      variantColor: 0x547a59,
      shadowColor: 0x213d2a,
    },
    backgroundTerrainId: "vibrant-grass",
    digTerrainId: "dirt",
    terrains: [
      {
        id: "vibrant-grass",
        label: "Vibrant Grass",
        atlasId: "vibrant-grass",
        texturePrefix: "main-vibrant-grass",
        stackOrder: 10,
        placement: { kind: "background" },
        generation: {
          material: "vibrant meadow grass",
          texturePrompt:
            "lush bright grass with small clover shapes, mossy variation, and soft painterly edges",
          stylePrompt:
            "cozy hand-painted top-down terrain, readable 256px tiles, natural soft edges, no text",
        },
      },
      {
        id: "dirt",
        label: "Dirt",
        atlasId: "dirt",
        texturePrefix: "main-dirt",
        stackOrder: 20,
        cursorColor: 0xffd080,
        placement: { kind: "empty" },
        generation: {
          material: "warm farm dirt",
          texturePrompt:
            "tilled earth with soft ochre highlights, pebble flecks, and organic clumps",
          stylePrompt:
            "cozy hand-painted top-down terrain, readable 256px tiles, natural soft edges, no text",
        },
      },
    ],
    plants: [
      {
        plantId: "applewood",
        role: "tree",
        abundance: "common",
        notes: "Friendly fruit canopy for the first groves.",
      },
      {
        plantId: "pinecrest",
        role: "tree",
        abundance: "common",
        notes: "Evergreen structure for meadow edges.",
      },
      {
        plantId: "honeyfig",
        role: "tree",
        abundance: "uncommon",
        notes: "Warm edible landmark tree.",
      },
    ],
    objects: [],
    regions: [
      {
        id: "home-meadow",
        label: "Home Meadow",
        description:
          "A simple grass clearing with farmable dirt and friendly starter groves.",
        anchor: { xRatio: 0.5, yRatio: 0.5 },
        radiusTiles: 44,
        terrains: [
          { terrainId: "vibrant-grass", weight: 1 },
          { terrainId: "dirt", weight: 0.16 },
        ],
        plants: [
          { plantId: "applewood", weight: 0.5 },
          { plantId: "pinecrest", weight: 0.35 },
          { plantId: "honeyfig", weight: 0.15 },
        ],
        objects: [],
        connections: [],
      },
    ],
    worldGeneration: {
      seed: 872341,
      spawnClearingRadius: 8,
      treePlantIds: ["applewood", "pinecrest", "honeyfig"],
    },
  },
  uniswap: {
    id: "uniswap",
    label: "Uniswap Commons",
    subtitle: "A lake, forest, city plain, and swamp shaped by liquidity routes.",
    description:
      "A simplified Uniswap Commons: a large liquidity lake sits inside a branded forest, a flat civic plain leaves room for the main city, and an oracle swamp gathers the wettest glassy terrain at the edge.",
    baseLayer: {
      baseColor: 0x6f4ad8,
      variantColor: 0x86d6bc,
      shadowColor: 0x24143f,
    },
    backgroundTerrainId: "plain",
    digTerrainId: "dirt",
    terrains: [
      uniswapTerrain(
        "plain",
        "Plain Terrain",
        "uniswap-plain",
        10,
        "background",
        0,
        "soft Uniswap pearl plain",
        "quiet pearl-lavender meadow ground with faint violet clover specks, mint dew, and open playable negative space for the city plain",
        "vibrant-grass",
      ),
      uniswapTerrain(
        "grass",
        "Grass Terrain",
        "uniswap-grass",
        14,
        "patches",
        17,
        "Uniswap violet clover grass",
        "violet clover grass mixed with mint leaves, sparse pearl dew beads, and small unicorn-pink flower sparks",
        "vibrant-grass",
        { frequency: 0.058, threshold: 0.62, avoidSpawnRadius: 5 },
      ),
      uniswapTerrain(
        "forest-floor",
        "Forest Floor Terrain",
        "uniswap-forest-floor",
        18,
        "patches",
        29,
        "Uniswap enchanted forest floor",
        "deep violet leaf litter, mint moss cushions, fallen pink fronds, tiny mushrooms, and soft shaded clover gaps",
        "vibrant-grass",
        { frequency: 0.06, threshold: 0.58, avoidSpawnRadius: 8 },
      ),
      uniswapTerrain(
        "dirt",
        "Dirt Terrain",
        "uniswap-dirt",
        20,
        "patches",
        43,
        "rose swapstone dirt",
        "warm pink-lavender farmable soil with powdered quartz, small violet roots, and occasional mint mineral glints",
        "dirt",
        { frequency: 0.052, threshold: 0.68, avoidSpawnRadius: 4, cursorColor: 0xff89d6 },
      ),
      uniswapTerrain(
        "sand",
        "Sand Terrain",
        "uniswap-sand",
        22,
        "patches",
        59,
        "pearl liquidity sand",
        "pale pearl sand with soft lavender shadows, tiny mint shell flecks, faint pink tide arcs, readable beach and lakebank texture",
        "dirt",
        { frequency: 0.055, threshold: 0.64, avoidSpawnRadius: 7 },
      ),
      uniswapTerrain(
        "stone",
        "Stone Terrain",
        "uniswap-stone",
        24,
        "patches",
        71,
        "lavender governance stone",
        "flat lavender-gray civic stones with rounded worn edges, subtle violet seams, mint moss cracks, and pearl dew highlights",
        "dirt",
        { frequency: 0.05, threshold: 0.63, avoidSpawnRadius: 4 },
      ),
      uniswapTerrain(
        "swamp",
        "Swamp Terrain",
        "uniswap-swamp",
        26,
        "patches",
        83,
        "oracle liquidity swamp",
        "dark teal-violet wetland mud with shallow cyan puddles, mirror-glass flecks, mint reeds, and pink pool bubbles",
        "water",
        { frequency: 0.052, threshold: 0.61, avoidSpawnRadius: 9 },
      ),
      uniswapTerrain(
        "water",
        "Water Terrain",
        "uniswap-water",
        30,
        "patches",
        97,
        "Uniswap liquidity lake water",
        "clear teal lake water with broad slow violet and unicorn-pink paired currents, opalescent highlights, calm readable shoreline edges",
        "water",
        { frequency: 0.045, threshold: 0.58, avoidSpawnRadius: 9 },
      ),
      uniswapTerrain(
        "path",
        "Path Terrain",
        "uniswap-path",
        32,
        "patches",
        109,
        "luminous route path",
        "thin pearly route-silk footpath braided through lavender dust, mint and pink glints, lightly worn walking marks",
        "dirt",
        { frequency: 0.036, threshold: 0.7, avoidSpawnRadius: 3 },
      ),
    ],
    plants: [
      {
        plantId: "poolblossom",
        role: "crop",
        abundance: "signature",
        notes: "Floating and shoreline blooms for the liquidity lake.",
      },
      {
        plantId: "liquidity-reed",
        role: "crop",
        abundance: "common",
        notes: "Tall pool-edge reed for water and pearl sand banks.",
      },
      {
        plantId: "routeberry",
        role: "crop",
        abundance: "common",
        notes: "Low route vine for paths, grass, and farmable city dirt.",
      },
      {
        plantId: "city-clover",
        role: "crop",
        abundance: "common",
        notes: "Low civic clover for the open city plain.",
      },
      {
        plantId: "swamp-orchid",
        role: "crop",
        abundance: "common",
        notes: "Bright wetland bloom for the oracle swamp.",
      },
      {
        plantId: "mirror-reed",
        role: "crop",
        abundance: "uncommon",
        notes: "Glassy reed for reflective swamp and lake water edges.",
      },
      {
        plantId: "unicornwillow",
        role: "tree",
        abundance: "signature",
        notes: "Pink-frond signature tree for the main Uniswap forest.",
      },
      {
        plantId: "tickbloom",
        role: "tree",
        abundance: "common",
        notes: "Tiered violet bloom tree for dense forest cover.",
      },
      {
        plantId: "moonwillow",
        role: "tree",
        abundance: "uncommon",
        notes: "Silvery wet-root tree near the lake and swamp.",
      },
      {
        plantId: "starblossom",
        role: "tree",
        abundance: "uncommon",
        notes: "Violet star-flowered canopy for forest clearings.",
      },
      {
        plantId: "poolcypress",
        role: "tree",
        abundance: "rare",
        notes: "Teal pool-edge cypress for lake and swamp transitions.",
      },
      {
        plantId: "stonepine",
        role: "tree",
        abundance: "rare",
        notes: "Small sculptural tree for city stone and civic edges.",
      },
    ],
    objects: [
      biomeObject("violet-clover-bush", "Violet Clover Bush", "decoration", 1, 1, "uniswap-nature-props", 0, 0, 1.12, "grove-edge", 56, 301, ["unicorn-forest", "swap-city-plain"], ["grass", "forest-floor"]),
      biomeObject("mint-moss-stone", "Mint Moss Stone", "decoration", 1, 1, "uniswap-nature-props", 0, 1, 1.05, "scattered", 44, 317, ["unicorn-forest", "oracle-swamp"], ["forest-floor", "swamp", "stone"]),
      biomeObject("pearl-sand-shells", "Pearl Sand Shells", "decoration", 1, 1, "uniswap-nature-props", 0, 2, 0.95, "pool-edge", 28, 331, ["liquidity-lake"], ["sand"]),
      biomeObject("oracle-glass-crystal", "Oracle Glass Crystal", "decoration", 1, 1, "uniswap-nature-props", 0, 3, 1.12, "scattered", 24, 347, ["oracle-swamp"], ["swamp"]),
      biomeObject("liquidity-reeds", "Liquidity Reeds", "decoration", 1, 2, "uniswap-nature-props", 1, 0, 1.18, "pool-edge", 42, 359, ["liquidity-lake", "oracle-swamp"], ["water", "sand", "swamp"]),
      biomeObject("route-silk-grass", "Route Silk Grass", "decoration", 1, 1, "uniswap-nature-props", 1, 1, 1, "path-edge", 42, 373, ["swap-city-plain", "unicorn-forest"], ["path", "grass"]),
      biomeObject("fee-moss-mushrooms", "Fee Moss Mushrooms", "decoration", 1, 1, "uniswap-nature-props", 1, 2, 1, "grove-edge", 32, 389, ["unicorn-forest", "oracle-swamp"], ["forest-floor", "swamp"]),
      biomeObject("unicorn-flower-clump", "Unicorn Flower Clump", "decoration", 1, 1, "uniswap-nature-props", 1, 3, 0.95, "scattered", 54, 401, ["unicorn-forest", "swap-city-plain"], ["plain", "grass", "forest-floor"]),
      biomeObject("swapstone-pebbles", "Swapstone Pebbles", "resource", 1, 1, "uniswap-nature-props", 2, 0, 1, "scattered", 34, 419, ["swap-city-plain"], ["dirt", "stone", "path"]),
      biomeObject("fallen-unicorn-branch", "Fallen Unicorn Branch", "resource", 2, 1, "uniswap-nature-props", 2, 1, 1.35, "grove-edge", 26, 431, ["unicorn-forest"], ["forest-floor", "grass"]),
      biomeObject("liquidity-puddle", "Liquidity Puddle", "decoration", 1, 1, "uniswap-nature-props", 2, 2, 1.1, "pool-edge", 30, 443, ["liquidity-lake", "oracle-swamp"], ["water", "swamp"], 0.68),
      biomeObject("governance-stone-outcrop", "Governance Stone Outcrop", "landmark", 2, 2, "uniswap-nature-props", 2, 3, 1.6, "scattered", 12, 457, ["swap-city-plain"], ["stone"]),
      biomeObject("forest-root-cluster", "Forest Root Cluster", "resource", 1, 1, "uniswap-nature-props", 3, 0, 1.08, "grove-edge", 28, 467, ["unicorn-forest"], ["forest-floor"]),
      biomeObject("pink-thistle", "Pink Thistle", "decoration", 1, 1, "uniswap-nature-props", 3, 1, 1, "scattered", 26, 479, ["swap-city-plain", "oracle-swamp"], ["dirt", "sand", "swamp"]),
      biomeObject("swamp-bubble-moss", "Swamp Bubble Moss", "decoration", 1, 1, "uniswap-nature-props", 3, 2, 1.08, "pool-edge", 34, 491, ["oracle-swamp"], ["swamp"]),
      biomeObject("violet-log", "Violet Log", "resource", 2, 1, "uniswap-nature-props", 3, 3, 1.3, "grove-edge", 24, 503, ["unicorn-forest"], ["forest-floor"]),
      biomeObject("round-swap-plaza-stone", "Round Swap Plaza Stone", "landmark", 2, 2, "uniswap-city-props", 0, 0, 1.55, "spawn-ring", 1, 601, ["swap-city-plain"], ["stone", "plain"]),
      biomeObject("liquidity-lantern", "Liquidity Lantern", "decoration", 1, 1, "uniswap-city-props", 0, 2, 1.08, "path-edge", 16, 607, ["swap-city-plain"], ["path", "stone"]),
      biomeObject("clover-planter", "Clover Planter", "decoration", 1, 1, "uniswap-city-props", 0, 3, 1.08, "scattered", 18, 613, ["swap-city-plain"], ["plain", "stone"]),
      biomeObject("mint-pink-marker-stones", "Mint Pink Marker Stones", "decoration", 1, 1, "uniswap-lake-props", 1, 0, 1, "pool-edge", 22, 619, ["liquidity-lake"], ["sand", "water"]),
      biomeObject("mirror-moss-pad", "Mirror Moss Pad", "decoration", 1, 1, "uniswap-swamp-props", 0, 2, 1.05, "pool-edge", 28, 631, ["oracle-swamp"], ["swamp"]),
    ],
    regions: [
      {
        id: "liquidity-lake",
        label: "Liquidity Lake",
        description:
          "A large lake set inside the forest, with pearl sand banks and pool-loving plants around the waterline.",
        anchor: { xRatio: 0.32, yRatio: 0.34 },
        radiusTiles: 34,
        terrains: [
          { terrainId: "water", weight: 1.15 },
          { terrainId: "sand", weight: 0.54 },
          { terrainId: "grass", weight: 0.24 },
          { terrainId: "forest-floor", weight: 0.16 },
        ],
        plants: [
          { plantId: "poolblossom", weight: 0.5, terrainIds: ["water", "sand"] },
          { plantId: "liquidity-reed", weight: 0.34, terrainIds: ["water", "sand"] },
          { plantId: "mirror-reed", weight: 0.12, terrainIds: ["water"] },
          { plantId: "moonwillow", weight: 0.22, terrainIds: ["sand", "forest-floor"] },
          { plantId: "poolcypress", weight: 0.28, terrainIds: ["sand", "forest-floor", "swamp"] },
        ],
        objects: [
          { objectId: "liquidity-reeds", weight: 0.48, terrainIds: ["water", "sand"] },
          { objectId: "liquidity-puddle", weight: 0.28, terrainIds: ["water"] },
          { objectId: "pearl-sand-shells", weight: 0.34, terrainIds: ["sand"] },
          { objectId: "mint-pink-marker-stones", weight: 0.22, terrainIds: ["sand", "water"] },
        ],
        connections: ["unicorn-forest", "swap-city-plain", "oracle-swamp"],
      },
      {
        id: "unicorn-forest",
        label: "Unicorn Forest",
        description:
          "A dense branded forest around the lake with several tree species, bushes, logs, roots, mushrooms, and stones.",
        anchor: { xRatio: 0.34, yRatio: 0.48 },
        radiusTiles: 48,
        terrains: [
          { terrainId: "forest-floor", weight: 0.96 },
          { terrainId: "grass", weight: 0.5 },
          { terrainId: "dirt", weight: 0.18 },
          { terrainId: "path", weight: 0.16 },
        ],
        plants: [
          { plantId: "unicornwillow", weight: 0.34, terrainIds: ["forest-floor", "grass"] },
          { plantId: "tickbloom", weight: 0.26, terrainIds: ["forest-floor"] },
          { plantId: "moonwillow", weight: 0.16, terrainIds: ["forest-floor"] },
          { plantId: "starblossom", weight: 0.16, terrainIds: ["forest-floor", "grass"] },
          { plantId: "poolcypress", weight: 0.08, terrainIds: ["forest-floor"] },
          { plantId: "routeberry", weight: 0.08, terrainIds: ["path", "grass"] },
        ],
        objects: [
          { objectId: "violet-clover-bush", weight: 0.38, terrainIds: ["grass", "forest-floor"] },
          { objectId: "mint-moss-stone", weight: 0.24, terrainIds: ["forest-floor"] },
          { objectId: "fee-moss-mushrooms", weight: 0.3, terrainIds: ["forest-floor"] },
          { objectId: "fallen-unicorn-branch", weight: 0.24, terrainIds: ["forest-floor"] },
          { objectId: "forest-root-cluster", weight: 0.28, terrainIds: ["forest-floor"] },
          { objectId: "violet-log", weight: 0.2, terrainIds: ["forest-floor"] },
        ],
        connections: ["liquidity-lake", "swap-city-plain", "oracle-swamp"],
      },
      {
        id: "swap-city-plain",
        label: "Swap City Plain",
        description:
          "A flat readable region reserved for the main city, using plain ground, route paths, governance stone, and farmable dirt patches.",
        anchor: { xRatio: 0.68, yRatio: 0.5 },
        radiusTiles: 36,
        terrains: [
          { terrainId: "plain", weight: 1 },
          { terrainId: "path", weight: 0.62 },
          { terrainId: "stone", weight: 0.54 },
          { terrainId: "dirt", weight: 0.22 },
          { terrainId: "grass", weight: 0.18 },
        ],
        plants: [
          { plantId: "routeberry", weight: 0.28, terrainIds: ["path", "grass", "dirt"] },
          { plantId: "city-clover", weight: 0.3, terrainIds: ["plain", "grass", "dirt"] },
          { plantId: "poolblossom", weight: 0.12, terrainIds: ["dirt", "grass"] },
          { plantId: "stonepine", weight: 0.18, terrainIds: ["stone", "grass"] },
        ],
        objects: [
          { objectId: "round-swap-plaza-stone", weight: 0.8, terrainIds: ["stone", "plain"] },
          { objectId: "liquidity-lantern", weight: 0.3, terrainIds: ["path", "stone"] },
          { objectId: "clover-planter", weight: 0.22, terrainIds: ["plain", "stone"] },
          { objectId: "route-silk-grass", weight: 0.24, terrainIds: ["path", "grass"] },
          { objectId: "swapstone-pebbles", weight: 0.16, terrainIds: ["dirt", "stone", "path"] },
          { objectId: "governance-stone-outcrop", weight: 0.18, terrainIds: ["stone"] },
        ],
        connections: ["liquidity-lake", "unicorn-forest", "oracle-swamp"],
      },
      {
        id: "oracle-swamp",
        label: "Oracle Swamp",
        description:
          "A compact glassy wetland with swamp terrain, water pockets, reeds, crystals, moss pads, and wetland plants.",
        anchor: { xRatio: 0.74, yRatio: 0.77 },
        radiusTiles: 29,
        terrains: [
          { terrainId: "swamp", weight: 0.98 },
          { terrainId: "water", weight: 0.34 },
          { terrainId: "sand", weight: 0.18 },
          { terrainId: "forest-floor", weight: 0.22 },
          { terrainId: "grass", weight: 0.14 },
        ],
        plants: [
          { plantId: "poolblossom", weight: 0.22, terrainIds: ["water", "swamp"] },
          { plantId: "liquidity-reed", weight: 0.22, terrainIds: ["water", "swamp"] },
          { plantId: "swamp-orchid", weight: 0.34, terrainIds: ["swamp"] },
          { plantId: "mirror-reed", weight: 0.26, terrainIds: ["water", "swamp"] },
          { plantId: "moonwillow", weight: 0.28, terrainIds: ["swamp", "forest-floor"] },
          { plantId: "poolcypress", weight: 0.32, terrainIds: ["swamp", "sand"] },
          { plantId: "tickbloom", weight: 0.12, terrainIds: ["forest-floor", "swamp"] },
        ],
        objects: [
          { objectId: "oracle-glass-crystal", weight: 0.36, terrainIds: ["swamp"] },
          { objectId: "swamp-bubble-moss", weight: 0.42, terrainIds: ["swamp"] },
          { objectId: "liquidity-reeds", weight: 0.32, terrainIds: ["swamp", "water"] },
          { objectId: "mirror-moss-pad", weight: 0.26, terrainIds: ["swamp"] },
          { objectId: "mint-moss-stone", weight: 0.18, terrainIds: ["swamp", "forest-floor"] },
          { objectId: "liquidity-puddle", weight: 0.22, terrainIds: ["swamp", "water"] },
        ],
        connections: ["liquidity-lake", "unicorn-forest", "swap-city-plain"],
      },
    ],
    worldGeneration: {
      seed: 4042024,
      spawnClearingRadius: 11,
      treePlantIds: [
        "unicornwillow",
        "tickbloom",
        "moonwillow",
        "starblossom",
        "poolcypress",
        "stonepine",
      ],
    },
  },
};

export const activeBiomeId = "uniswap";

export function getActiveBiome(): BiomeDefinition {
  return biomeDefinitions[activeBiomeId] ?? biomeDefinitions.meadow;
}

export function getBiomeTerrain(
  biome: BiomeDefinition,
  terrainId: string,
): BiomeTerrainDefinition {
  const terrain = biome.terrains.find((entry) => entry.id === terrainId);

  if (!terrain) {
    throw new Error(`Biome ${biome.id} is missing terrain ${terrainId}.`);
  }

  return terrain;
}
