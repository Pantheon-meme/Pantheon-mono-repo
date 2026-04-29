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
  generation: {
    objectBrief: string;
    stylePrompt: string;
  };
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
  worldGeneration: {
    seed: number;
    spawnClearingRadius: number;
    treePlantIds: string[];
  };
};

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
    worldGeneration: {
      seed: 872341,
      spawnClearingRadius: 8,
      treePlantIds: ["applewood", "pinecrest", "honeyfig"],
    },
  },
  uniswap: {
    id: "uniswap",
    label: "Uniswap Commons",
    subtitle: "A luminous liquidity garden where routes, pools, and people meet.",
    description:
      "Uniswap Town grows around a shared swap plaza: opalescent paths braid through violet clover, mirror pools shimmer with paired-token currents, and every grove feels like a place for governance, builders, artists, and liquidity providers to gather.",
    baseLayer: {
      baseColor: 0x6f4ad8,
      variantColor: 0x86d6bc,
      shadowColor: 0x24143f,
    },
    backgroundTerrainId: "v3-clover",
    digTerrainId: "dirt",
    terrains: [
      {
        id: "v3-clover",
        label: "V3 Clover",
        atlasId: "uniswap-v3-clover",
        texturePrefix: "uniswap-v3-clover",
        stackOrder: 10,
        placement: { kind: "background" },
        generation: {
          material: "Uniswap violet clover meadow",
          texturePrompt:
            "dense violet and mint clover, tiny pearl dew drops, subtle unicorn-pink flower sparks, cozy playable top-down meadow",
          stylePrompt:
            "cozy hand-painted 2D game terrain, three-quarter top-down, crisp 47-tile dual-grid autotile readability, no logos, no text",
          sampleStyleAtlasId: "vibrant-grass",
        },
      },
      {
        id: "dirt",
        label: "Swapstone Dust",
        atlasId: "uniswap-swapstone-dust",
        texturePrefix: "uniswap-swapstone-dust",
        stackOrder: 20,
        cursorColor: 0xff89d6,
        placement: {
          kind: "patches",
          seedOffset: 11,
          frequency: 0.052,
          threshold: 0.68,
          avoidSpawnRadius: 4,
        },
        generation: {
          material: "rose quartz swapstone dust",
          texturePrompt:
            "soft pink-lavender mineral soil, powdered quartz, faint path-worn arcs, small glints like settled stardust",
          stylePrompt:
            "cozy hand-painted 2D game terrain, warm mineral texture, readable when dug or planted, no logos, no text",
          sampleStyleAtlasId: "dirt",
        },
      },
      {
        id: "governance-stone",
        label: "Governance Stone",
        atlasId: "uniswap-governance-stone",
        texturePrefix: "uniswap-governance-stone",
        stackOrder: 24,
        placement: {
          kind: "patches",
          seedOffset: 17,
          frequency: 0.055,
          threshold: 0.66,
          avoidSpawnRadius: 5,
        },
        generation: {
          material: "smooth civic governance stone",
          texturePrompt:
            "flat lavender-gray plaza stones, soft worn edges, tiny mint moss in seams, made for civic meeting paths",
          stylePrompt:
            "cozy hand-painted 2D game terrain, readable stone path autotiles, no logos, no text",
          sampleStyleAtlasId: "dirt",
        },
      },
      {
        id: "oracle-glass",
        label: "Oracle Glass",
        atlasId: "uniswap-oracle-glass",
        texturePrefix: "uniswap-oracle-glass",
        stackOrder: 26,
        placement: {
          kind: "patches",
          seedOffset: 53,
          frequency: 0.072,
          threshold: 0.77,
          avoidSpawnRadius: 8,
        },
        generation: {
          material: "transparent oracle glass",
          texturePrompt:
            "thin reflective glass plates over shallow luminous data streams, pale cyan highlights, violet shadows, crystalline edges",
          stylePrompt:
            "cozy hand-painted 2D game terrain, transparent watery-glass autotile edges, no logos, no text",
          sampleStyleAtlasId: "water",
        },
      },
      {
        id: "fee-tier-moss",
        label: "Fee Tier Moss",
        atlasId: "uniswap-fee-tier-moss",
        texturePrefix: "uniswap-fee-tier-moss",
        stackOrder: 18,
        placement: {
          kind: "patches",
          seedOffset: 89,
          frequency: 0.09,
          threshold: 0.74,
          avoidSpawnRadius: 4,
        },
        generation: {
          material: "layered mint fee tier moss",
          texturePrompt:
            "small stepped patches of mint, teal, and violet moss, flower dots grouped in gentle bands, soft playable meadow texture",
          stylePrompt:
            "cozy hand-painted 2D game terrain, organic autotile patch edges, no logos, no text",
          sampleStyleAtlasId: "vibrant-grass",
        },
      },
      {
        id: "liquidity-pool",
        label: "Liquidity Pool",
        atlasId: "uniswap-liquidity-pool",
        texturePrefix: "uniswap-liquidity-pool",
        stackOrder: 30,
        placement: {
          kind: "patches",
          seedOffset: 131,
          frequency: 0.045,
          threshold: 0.78,
          avoidSpawnRadius: 7,
        },
        generation: {
          material: "magical liquidity pool water",
          texturePrompt:
            "clear teal water with violet and pink currents blending in paired streams, opalescent highlights, calm plaza fountain energy",
          stylePrompt:
            "cozy hand-painted 2D game water terrain, readable 47-tile autotile edges, no logos, no text",
          sampleStyleAtlasId: "water",
        },
      },
      {
        id: "route-silk",
        label: "Route Silk",
        atlasId: "uniswap-route-silk",
        texturePrefix: "uniswap-route-silk",
        stackOrder: 32,
        placement: {
          kind: "patches",
          seedOffset: 197,
          frequency: 0.035,
          threshold: 0.7,
          avoidSpawnRadius: 3,
        },
        generation: {
          material: "thin luminous route silk",
          texturePrompt:
            "narrow pearly path threads braided through terrain, pink and mint glints, soft crossing route marks like footpaths",
          stylePrompt:
            "cozy hand-painted 2D game terrain, readable path autotiles, subtle luminous accents, no logos, no text",
          sampleStyleAtlasId: "dirt",
        },
      },
    ],
    plants: [
      {
        plantId: "poolblossom",
        role: "crop",
        abundance: "signature",
        notes:
          "Small flowers that bloom brighter near community pools and plazas.",
      },
      {
        plantId: "routeberry",
        role: "crop",
        abundance: "common",
        notes:
          "A winding vine crop that hints at trade routes through the commons.",
      },
      {
        plantId: "unicornwillow",
        role: "tree",
        abundance: "signature",
        notes:
          "The central Uniswap Town shade tree: pink fronds, mint bark, pearl seed pods.",
      },
      {
        plantId: "tickbloom",
        role: "tree",
        abundance: "uncommon",
        notes:
          "Tiered flowering trees arranged like ranges around gathering paths.",
      },
    ],
    objects: [
      {
        id: "swap-plaza",
        label: "Swap Plaza",
        role: "gathering-place",
        footprintTiles: { width: 9, height: 9 },
        generation: {
          objectBrief:
            "round civic plaza with twin crescent channels, low benches, potted clover, lanterns, and a central pool shaped for community gatherings",
          stylePrompt:
            "cozy hand-painted 2D town landmark, three-quarter top-down, readable at small scale, no text, no logos",
        },
      },
      {
        id: "governance-arch",
        label: "Governance Arch",
        role: "landmark",
        footprintTiles: { width: 5, height: 3 },
        generation: {
          objectBrief:
            "open stone arch with violet pennants, proposal tablets, flower baskets, and a welcoming path beneath it",
          stylePrompt:
            "cozy hand-painted 2D game building prop, transparent background, readable silhouette, no text, no logos",
        },
      },
      {
        id: "liquidity-lantern",
        label: "Liquidity Lantern",
        role: "decoration",
        footprintTiles: { width: 1, height: 1 },
        generation: {
          objectBrief:
            "small garden lantern holding two softly mixing lights, one mint and one pink, mounted on a dark curved post",
          stylePrompt:
            "cozy hand-painted 2D game prop, transparent background, readable top-down object, no text, no logos",
        },
      },
    ],
    worldGeneration: {
      seed: 4042024,
      spawnClearingRadius: 10,
      treePlantIds: ["unicornwillow", "tickbloom", "moonwillow", "starblossom"],
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
