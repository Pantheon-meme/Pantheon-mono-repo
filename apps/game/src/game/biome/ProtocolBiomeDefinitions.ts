import type {
  BiomeDefinition,
  BiomeObjectDefinition,
  BiomeTerrainDefinition,
  TerrainGenerationPrompt,
} from "./BiomeDefinitions";
import type { TerrainAtlasAssetId } from "../../assets/autotiles/TerrainAtlasAssets";

type ProtocolTerrainOptions = {
  frequency?: number;
  threshold?: number;
  avoidSpawnRadius?: number;
  cursorColor?: number;
};

const terrainStylePrompt =
  "cozy hand-painted 2D game terrain, top-down, crisp dual-grid autotile readability, no logos, no text";
const objectStylePrompt =
  "cozy hand-painted 2D biome prop, transparent background, readable top-down object, no text, no logos";

const sampleByTerrain: Record<string, TerrainAtlasAssetId> = {
  plain: "vibrant-grass",
  grass: "vibrant-grass",
  "forest-floor": "vibrant-grass",
  dirt: "dirt",
  sand: "dirt",
  stone: "dirt",
  swamp: "water",
  water: "water",
  path: "dirt",
};

const calmerTerrainTextureDirection =
  "use larger 2x-scale readable shapes, fewer tiny repeated flecks, lower micro-detail density, clear quiet negative space for characters and objects";

const calmerTerrainStyleDirection =
  "larger readable motifs, low visual noise, no speckled carpet texture";

function calmerTerrainTexture(texturePrompt: string): string {
  return `${texturePrompt}; ${calmerTerrainTextureDirection}`;
}

function protocolTerrain(
  assetPrefix: string,
  terrainId: string,
  label: string,
  stackOrder: number,
  placementKind: "background" | "patches",
  seedOffset: number,
  generation: TerrainGenerationPrompt,
  options: ProtocolTerrainOptions = {},
): BiomeTerrainDefinition {
  const atlasId = `${assetPrefix}-${terrainId}`;

  return {
    id: terrainId,
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
      ...generation,
      texturePrompt: calmerTerrainTexture(generation.texturePrompt),
      stylePrompt: `${generation.stylePrompt}, ${calmerTerrainStyleDirection}`,
      sampleStyleAtlasId:
        generation.sampleStyleAtlasId ?? sampleByTerrain[terrainId] ?? "dirt",
    },
  };
}

function zeroGTerrain(
  terrainId: string,
  label: string,
  stackOrder: number,
  placementKind: "background" | "patches",
  seedOffset: number,
  generation: TerrainGenerationPrompt,
  options: ProtocolTerrainOptions = {},
): BiomeTerrainDefinition {
  return protocolTerrain(
    "0g",
    terrainId,
    label,
    stackOrder,
    placementKind,
    seedOffset,
    generation,
    options,
  );
}

function gensynTerrain(
  terrainId: string,
  label: string,
  stackOrder: number,
  placementKind: "background" | "patches",
  seedOffset: number,
  generation: TerrainGenerationPrompt,
  options: ProtocolTerrainOptions = {},
): BiomeTerrainDefinition {
  return protocolTerrain(
    "gensyn",
    terrainId,
    label,
    stackOrder,
    placementKind,
    seedOffset,
    generation,
    options,
  );
}

function protocolObject(
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
  themeBrief: string,
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
      objectBrief: `${label}, ${themeBrief} biome object for ${terrainIds.join(", ")} terrain.`,
      stylePrompt: objectStylePrompt,
    },
  };
}

const zeroGTheme =
  "0G-inspired modular AI infrastructure, black space, electric violet, neon cyan, hot magenta, luminous node grids, data availability shards, and high-throughput chain energy";
const gensynTheme =
  "Gensyn-inspired decentralized machine learning compute, black and white base, bright green signal, amber verification light, clean research lab geometry, model meshes, and peer compute clusters";

function terrainPrompt(
  material: string,
  texturePrompt: string,
  theme: string,
): TerrainGenerationPrompt {
  return {
    material,
    texturePrompt,
    stylePrompt: `${terrainStylePrompt}, ${theme}`,
  };
}

export const protocolBiomeDefinitions: Record<string, BiomeDefinition> = {
  "0g": {
    id: "0g",
    label: "0G Nexus",
    subtitle:
      "A modular AI frontier of data shards, compute groves, and fast chainways.",
    description:
      "A 0G-inspired world built around decentralized AI infrastructure: a luminous data lake feeds modular storage shards, compute forests, and chain corridors for high-throughput movement.",
    baseLayer: {
      baseColor: 0x15111f,
      variantColor: 0x00d5ff,
      shadowColor: 0x08050d,
    },
    backgroundTerrainId: "plain",
    digTerrainId: "dirt",
    terrains: [
      zeroGTerrain(
        "plain",
        "Void Plain",
        10,
        "background",
        0,
        terrainPrompt(
          "quiet 0G black-violet substrate",
          "deep graphite plain with faint violet grid dust, cyan pin lights, and open playable negative space",
          zeroGTheme,
        ),
      ),
      zeroGTerrain(
        "grass",
        "Signal Grass",
        14,
        "patches",
        17,
        terrainPrompt(
          "electric 0G signal grass",
          "short cyan and violet fiber grass with sparse magenta packet sparks and soft black soil gaps",
          zeroGTheme,
        ),
        { frequency: 0.058, threshold: 0.62, avoidSpawnRadius: 5 },
      ),
      zeroGTerrain(
        "forest-floor",
        "Compute Grove",
        18,
        "patches",
        29,
        terrainPrompt(
          "modular compute grove floor",
          "dark violet leaf litter crossed by tiny circuit roots, cyan moss buffers, and magenta cache blooms",
          zeroGTheme,
        ),
        { frequency: 0.06, threshold: 0.58, avoidSpawnRadius: 8 },
      ),
      zeroGTerrain(
        "dirt",
        "Shard Dust",
        20,
        "patches",
        43,
        terrainPrompt(
          "farmable 0G shard dust",
          "black-lilac mineral soil with powdered glass shards, violet roots, and cyan data flecks",
          zeroGTheme,
        ),
        {
          frequency: 0.052,
          threshold: 0.68,
          avoidSpawnRadius: 4,
          cursorColor: 0x00d5ff,
        },
      ),
      zeroGTerrain(
        "sand",
        "Data Beach",
        22,
        "patches",
        59,
        terrainPrompt(
          "pale data availability sand",
          "cool silver sand with violet shadows, cyan checksum specks, and magenta tide arcs",
          zeroGTheme,
        ),
        { frequency: 0.055, threshold: 0.64, avoidSpawnRadius: 7 },
      ),
      zeroGTerrain(
        "stone",
        "Validator Stone",
        24,
        "patches",
        71,
        terrainPrompt(
          "black validator stone",
          "flat obsidian-purple slabs with cyan seams, magenta edge light, and worn modular corners",
          zeroGTheme,
        ),
        { frequency: 0.05, threshold: 0.63, avoidSpawnRadius: 4 },
      ),
      zeroGTerrain(
        "swamp",
        "Inference Mire",
        26,
        "patches",
        83,
        terrainPrompt(
          "glowing inference wetland",
          "dark violet wetland mud with shallow cyan inference pools, magenta bubbles, and fiber reeds",
          zeroGTheme,
        ),
        { frequency: 0.052, threshold: 0.61, avoidSpawnRadius: 9 },
      ),
      zeroGTerrain(
        "water",
        "Data Lake",
        30,
        "patches",
        97,
        terrainPrompt(
          "0G data availability lake",
          "black glass water with broad cyan streams, violet depth, magenta packet glints, and calm readable shores",
          zeroGTheme,
        ),
        { frequency: 0.045, threshold: 0.58, avoidSpawnRadius: 9 },
      ),
      zeroGTerrain(
        "path",
        "Modular Chainway",
        32,
        "patches",
        109,
        terrainPrompt(
          "luminous modular chainway",
          "thin cyan-violet route lines braided through black dust with magenta relay ticks and lightly worn travel marks",
          zeroGTheme,
        ),
        { frequency: 0.036, threshold: 0.7, avoidSpawnRadius: 3 },
      ),
    ],
    plants: [
      {
        plantId: "0g-routevine",
        role: "crop",
        abundance: "common",
        notes: "Low relay vine for chainways and shard dust.",
      },
      {
        plantId: "0g-mirror-reed",
        role: "crop",
        abundance: "common",
        notes: "Glassy reed for data lake and inference mire edges.",
      },
      {
        plantId: "0g-packet-bloom",
        role: "crop",
        abundance: "uncommon",
        notes: "Floating packet bloom for data pools.",
      },
      {
        plantId: "0g-inference-orchid",
        role: "crop",
        abundance: "uncommon",
        notes: "Bright inference bloom for wet compute terrain.",
      },
      {
        plantId: "0g-moonwillow",
        role: "tree",
        abundance: "common",
        notes: "Silver-cyan tree for storage grove edges.",
      },
      {
        plantId: "0g-starcache",
        role: "tree",
        abundance: "common",
        notes: "Violet star canopy for modular compute groves.",
      },
      {
        plantId: "0g-poolcypress",
        role: "tree",
        abundance: "rare",
        notes: "Pool-edge tree for the data lake.",
      },
      {
        plantId: "0g-validator-pine",
        role: "tree",
        abundance: "rare",
        notes: "Sparse validator-stone tree for chainway plazas.",
      },
    ],
    objects: [
      protocolObject(
        "0g-relay-pylon",
        "Relay Pylon",
        "landmark",
        2,
        2,
        "0g-nature-props",
        2,
        3,
        1.55,
        "region-center",
        1,
        701,
        ["validator-ridge"],
        ["stone", "path"],
        zeroGTheme,
      ),
      protocolObject(
        "0g-data-reeds",
        "Data Reeds",
        "decoration",
        1,
        2,
        "0g-nature-props",
        1,
        0,
        1.18,
        "pool-edge",
        54,
        719,
        ["data-availability-lake", "inference-mire"],
        ["water", "sand", "swamp"],
        zeroGTheme,
      ),
      protocolObject(
        "0g-cache-crystals",
        "Cache Crystals",
        "decoration",
        1,
        1,
        "0g-nature-props",
        0,
        3,
        1.12,
        "scattered",
        46,
        733,
        ["compute-grove", "inference-mire"],
        ["forest-floor", "swamp", "stone"],
        zeroGTheme,
      ),
      protocolObject(
        "0g-chainway-grass",
        "Chainway Grass",
        "decoration",
        1,
        1,
        "0g-nature-props",
        1,
        1,
        1,
        "path-edge",
        44,
        751,
        ["validator-ridge", "compute-grove"],
        ["path", "grass"],
        zeroGTheme,
      ),
      protocolObject(
        "0g-shard-pebbles",
        "Shard Pebbles",
        "resource",
        1,
        1,
        "0g-nature-props",
        2,
        0,
        1,
        "scattered",
        36,
        769,
        ["validator-ridge"],
        ["dirt", "stone", "path"],
        zeroGTheme,
      ),
    ],
    regions: [
      {
        id: "data-availability-lake",
        label: "Data Availability Lake",
        description:
          "A black-glass reservoir of available data with bright beaches, packet blooms, and reed-lined banks.",
        anchor: { xRatio: 0.3, yRatio: 0.34 },
        radiusTiles: 36,
        terrains: [
          { terrainId: "water", weight: 1.18 },
          { terrainId: "sand", weight: 0.52 },
          { terrainId: "grass", weight: 0.22 },
          { terrainId: "forest-floor", weight: 0.12 },
        ],
        plants: [
          {
            plantId: "0g-packet-bloom",
            weight: 0.42,
            terrainIds: ["water", "sand"],
          },
          {
            plantId: "0g-mirror-reed",
            weight: 0.36,
            terrainIds: ["water", "sand"],
          },
          {
            plantId: "0g-poolcypress",
            weight: 0.28,
            terrainIds: ["sand", "forest-floor"],
          },
          {
            plantId: "0g-moonwillow",
            weight: 0.2,
            terrainIds: ["sand", "forest-floor"],
          },
        ],
        objects: [
          {
            objectId: "0g-data-reeds",
            weight: 0.5,
            terrainIds: ["water", "sand"],
          },
          {
            objectId: "0g-cache-crystals",
            weight: 0.16,
            terrainIds: ["sand", "stone"],
          },
        ],
        connections: ["compute-grove", "validator-ridge", "inference-mire"],
      },
      {
        id: "compute-grove",
        label: "Compute Grove",
        description:
          "A dense compute forest where circuit roots, cache crystals, and signal grass gather under violet canopies.",
        anchor: { xRatio: 0.34, yRatio: 0.55 },
        radiusTiles: 48,
        terrains: [
          { terrainId: "forest-floor", weight: 1 },
          { terrainId: "grass", weight: 0.48 },
          { terrainId: "dirt", weight: 0.2 },
          { terrainId: "path", weight: 0.16 },
        ],
        plants: [
          {
            plantId: "0g-starcache",
            weight: 0.34,
            terrainIds: ["forest-floor", "grass"],
          },
          {
            plantId: "0g-moonwillow",
            weight: 0.28,
            terrainIds: ["forest-floor"],
          },
          {
            plantId: "0g-routevine",
            weight: 0.12,
            terrainIds: ["path", "grass"],
          },
          {
            plantId: "0g-validator-pine",
            weight: 0.12,
            terrainIds: ["stone", "grass"],
          },
        ],
        objects: [
          {
            objectId: "0g-cache-crystals",
            weight: 0.42,
            terrainIds: ["forest-floor", "stone"],
          },
          {
            objectId: "0g-chainway-grass",
            weight: 0.22,
            terrainIds: ["path", "grass"],
          },
        ],
        connections: [
          "data-availability-lake",
          "validator-ridge",
          "inference-mire",
        ],
      },
      {
        id: "validator-ridge",
        label: "Validator Ridge",
        description:
          "A readable high-ground corridor of black validator stone, chainways, and shard dust for civic structures.",
        anchor: { xRatio: 0.7, yRatio: 0.5 },
        radiusTiles: 38,
        terrains: [
          { terrainId: "plain", weight: 0.9 },
          { terrainId: "stone", weight: 0.72 },
          { terrainId: "path", weight: 0.66 },
          { terrainId: "dirt", weight: 0.2 },
          { terrainId: "grass", weight: 0.16 },
        ],
        plants: [
          {
            plantId: "0g-routevine",
            weight: 0.28,
            terrainIds: ["path", "grass", "dirt"],
          },
          {
            plantId: "0g-validator-pine",
            weight: 0.22,
            terrainIds: ["stone", "grass"],
          },
        ],
        objects: [
          {
            objectId: "0g-relay-pylon",
            weight: 0.8,
            terrainIds: ["stone", "path"],
          },
          {
            objectId: "0g-chainway-grass",
            weight: 0.32,
            terrainIds: ["path", "grass"],
          },
          {
            objectId: "0g-shard-pebbles",
            weight: 0.2,
            terrainIds: ["dirt", "stone", "path"],
          },
        ],
        connections: [
          "data-availability-lake",
          "compute-grove",
          "inference-mire",
        ],
      },
      {
        id: "inference-mire",
        label: "Inference Mire",
        description:
          "A wet inference edge with glowing pools, swamp mats, data reeds, and heavy cyan-violet moisture.",
        anchor: { xRatio: 0.75, yRatio: 0.72 },
        radiusTiles: 42,
        terrains: [
          { terrainId: "swamp", weight: 1.24 },
          { terrainId: "water", weight: 0.62 },
          { terrainId: "sand", weight: 0.36 },
          { terrainId: "forest-floor", weight: 0.5 },
          { terrainId: "grass", weight: 0.2 },
          { terrainId: "stone", weight: 0.16 },
        ],
        plants: [
          {
            plantId: "0g-inference-orchid",
            weight: 0.5,
            terrainIds: ["swamp"],
          },
          {
            plantId: "0g-mirror-reed",
            weight: 0.34,
            terrainIds: ["water", "swamp"],
          },
          {
            plantId: "0g-moonwillow",
            weight: 0.44,
            terrainIds: ["swamp", "forest-floor", "sand"],
          },
          {
            plantId: "0g-poolcypress",
            weight: 0.5,
            terrainIds: ["swamp", "sand", "forest-floor"],
          },
        ],
        objects: [
          {
            objectId: "0g-data-reeds",
            weight: 0.44,
            terrainIds: ["swamp", "water", "sand"],
          },
          {
            objectId: "0g-cache-crystals",
            weight: 0.36,
            terrainIds: ["swamp", "stone"],
          },
        ],
        connections: [
          "data-availability-lake",
          "compute-grove",
          "validator-ridge",
        ],
      },
    ],
    worldGeneration: {
      seed: 50092025,
      spawnClearingRadius: 11,
      treePlantIds: [
        "0g-moonwillow",
        "0g-starcache",
        "0g-poolcypress",
        "0g-validator-pine",
      ],
    },
  },
  gensyn: {
    id: "gensyn",
    label: "Gensyn Training Grounds",
    subtitle:
      "Peer compute fields, proof marshes, gradient groves, and research ridges.",
    description:
      "A Gensyn-inspired compute landscape where decentralized machine learning work becomes terrain: peer training fields, gradient forest, proof wetlands, and sparse research ridges.",
    baseLayer: {
      baseColor: 0x111513,
      variantColor: 0x79ff7a,
      shadowColor: 0x050605,
    },
    backgroundTerrainId: "plain",
    digTerrainId: "dirt",
    terrains: [
      gensynTerrain(
        "plain",
        "Peer Plain",
        10,
        "background",
        0,
        terrainPrompt(
          "clean peer compute plain",
          "quiet charcoal and soft off-white ground with pale green signal dots, clean lab spacing, and open playable negative space",
          gensynTheme,
        ),
      ),
      gensynTerrain(
        "grass",
        "Signal Grass",
        14,
        "patches",
        17,
        terrainPrompt(
          "green training signal grass",
          "short bright green grass fibers mixed with white chalk flecks, tiny amber loss sparks, and charcoal soil gaps",
          gensynTheme,
        ),
        { frequency: 0.058, threshold: 0.62, avoidSpawnRadius: 5 },
      ),
      gensynTerrain(
        "forest-floor",
        "Gradient Grove",
        18,
        "patches",
        29,
        terrainPrompt(
          "gradient descent grove floor",
          "dark leaf litter with green gradient strokes, white paper scraps, amber verification seeds, and soft model-root shadows",
          gensynTheme,
        ),
        { frequency: 0.06, threshold: 0.58, avoidSpawnRadius: 8 },
      ),
      gensynTerrain(
        "dirt",
        "Parameter Soil",
        20,
        "patches",
        43,
        terrainPrompt(
          "farmable parameter soil",
          "warm charcoal-brown soil with fine white chalk, green root threads, and amber metric flecks",
          gensynTheme,
        ),
        {
          frequency: 0.052,
          threshold: 0.68,
          avoidSpawnRadius: 4,
          cursorColor: 0x79ff7a,
        },
      ),
      gensynTerrain(
        "sand",
        "Dataset Sand",
        22,
        "patches",
        59,
        terrainPrompt(
          "pale dataset sand",
          "off-white sand with clean charcoal shadows, small green index marks, and faint amber contour lines",
          gensynTheme,
        ),
        { frequency: 0.055, threshold: 0.64, avoidSpawnRadius: 7 },
      ),
      gensynTerrain(
        "stone",
        "Proof Stone",
        24,
        "patches",
        71,
        terrainPrompt(
          "proof verification stone",
          "flat black and off-white lab stones with green seams, amber proof marks, and precise worn edges",
          gensynTheme,
        ),
        { frequency: 0.05, threshold: 0.63, avoidSpawnRadius: 4 },
      ),
      gensynTerrain(
        "swamp",
        "Verification Marsh",
        26,
        "patches",
        83,
        terrainPrompt(
          "verification marsh",
          "dark green-black wetland mud with shallow amber proof pools, white reflection flecks, and reed-like signal bars",
          gensynTheme,
        ),
        { frequency: 0.052, threshold: 0.61, avoidSpawnRadius: 9 },
      ),
      gensynTerrain(
        "water",
        "Model Lake",
        30,
        "patches",
        97,
        terrainPrompt(
          "model training lake",
          "deep black-green water with broad clean green currents, white highlights, amber uncertainty glints, and readable shores",
          gensynTheme,
        ),
        { frequency: 0.045, threshold: 0.58, avoidSpawnRadius: 9 },
      ),
      gensynTerrain(
        "path",
        "Gradient Path",
        32,
        "patches",
        109,
        terrainPrompt(
          "thin gradient training path",
          "bright green route strokes braided through dark dust with small amber checkpoints and white chalk wear",
          gensynTheme,
        ),
        { frequency: 0.036, threshold: 0.7, avoidSpawnRadius: 3 },
      ),
    ],
    plants: [
      {
        plantId: "gensyn-gradient-vine",
        role: "crop",
        abundance: "common",
        notes: "Low gradient vine for paths and parameter soil.",
      },
      {
        plantId: "gensyn-peer-clover",
        role: "crop",
        abundance: "common",
        notes: "Small peer-field clover for open compute plain.",
      },
      {
        plantId: "gensyn-proof-reed",
        role: "crop",
        abundance: "uncommon",
        notes: "Reflective reed for proof marshes and model lake edges.",
      },
      {
        plantId: "gensyn-modelbloom",
        role: "tree",
        abundance: "common",
        notes: "Branching model canopy for gradient groves.",
      },
      {
        plantId: "gensyn-tickbloom",
        role: "tree",
        abundance: "common",
        notes: "Layered training-step tree for dense groves.",
      },
      {
        plantId: "gensyn-proof-pine",
        role: "tree",
        abundance: "rare",
        notes: "Sparse proof-stone tree for research ridges.",
      },
      {
        plantId: "gensyn-moonwillow",
        role: "tree",
        abundance: "rare",
        notes: "Wet-root model tree near marsh and lake transitions.",
      },
    ],
    objects: [
      protocolObject(
        "gensyn-proof-marker",
        "Proof Marker",
        "landmark",
        2,
        2,
        "gensyn-nature-props",
        2,
        3,
        1.55,
        "region-center",
        1,
        801,
        ["proof-marsh"],
        ["stone", "swamp"],
        gensynTheme,
      ),
      protocolObject(
        "gensyn-signal-reeds",
        "Signal Reeds",
        "decoration",
        1,
        2,
        "gensyn-nature-props",
        1,
        0,
        1.18,
        "pool-edge",
        50,
        819,
        ["model-lake", "proof-marsh"],
        ["water", "sand", "swamp"],
        gensynTheme,
      ),
      protocolObject(
        "gensyn-gradient-clover",
        "Gradient Clover",
        "decoration",
        1,
        1,
        "gensyn-nature-props",
        0,
        0,
        1.08,
        "grove-edge",
        52,
        833,
        ["gradient-grove", "peer-plain"],
        ["grass", "forest-floor"],
        gensynTheme,
      ),
      protocolObject(
        "gensyn-checkpoint-grass",
        "Checkpoint Grass",
        "decoration",
        1,
        1,
        "gensyn-nature-props",
        1,
        1,
        1,
        "path-edge",
        42,
        851,
        ["peer-plain", "research-ridge"],
        ["path", "grass"],
        gensynTheme,
      ),
      protocolObject(
        "gensyn-metric-pebbles",
        "Metric Pebbles",
        "resource",
        1,
        1,
        "gensyn-nature-props",
        2,
        0,
        1,
        "scattered",
        34,
        869,
        ["research-ridge", "peer-plain"],
        ["dirt", "stone", "path"],
        gensynTheme,
      ),
    ],
    regions: [
      {
        id: "model-lake",
        label: "Model Lake",
        description:
          "A dark training lake where green currents, dataset sand, and reflective reeds mark shared model flow.",
        anchor: { xRatio: 0.31, yRatio: 0.34 },
        radiusTiles: 34,
        terrains: [
          { terrainId: "water", weight: 1.12 },
          { terrainId: "sand", weight: 0.52 },
          { terrainId: "grass", weight: 0.2 },
          { terrainId: "forest-floor", weight: 0.12 },
        ],
        plants: [
          {
            plantId: "gensyn-proof-reed",
            weight: 0.34,
            terrainIds: ["water", "sand"],
          },
          {
            plantId: "gensyn-moonwillow",
            weight: 0.24,
            terrainIds: ["sand", "forest-floor"],
          },
        ],
        objects: [
          {
            objectId: "gensyn-signal-reeds",
            weight: 0.46,
            terrainIds: ["water", "sand"],
          },
        ],
        connections: [
          "gradient-grove",
          "peer-plain",
          "proof-marsh",
          "research-ridge",
        ],
      },
      {
        id: "gradient-grove",
        label: "Gradient Grove",
        description:
          "A branching forest of model roots, signal grass, and layered training-step trees.",
        anchor: { xRatio: 0.34, yRatio: 0.54 },
        radiusTiles: 46,
        terrains: [
          { terrainId: "forest-floor", weight: 0.98 },
          { terrainId: "grass", weight: 0.5 },
          { terrainId: "dirt", weight: 0.2 },
          { terrainId: "path", weight: 0.18 },
        ],
        plants: [
          {
            plantId: "gensyn-modelbloom",
            weight: 0.3,
            terrainIds: ["forest-floor", "grass"],
          },
          {
            plantId: "gensyn-tickbloom",
            weight: 0.28,
            terrainIds: ["forest-floor"],
          },
          {
            plantId: "gensyn-gradient-vine",
            weight: 0.12,
            terrainIds: ["path", "grass"],
          },
        ],
        objects: [
          {
            objectId: "gensyn-gradient-clover",
            weight: 0.42,
            terrainIds: ["grass", "forest-floor"],
          },
          {
            objectId: "gensyn-checkpoint-grass",
            weight: 0.2,
            terrainIds: ["path", "grass"],
          },
        ],
        connections: [
          "model-lake",
          "peer-plain",
          "proof-marsh",
          "research-ridge",
        ],
      },
      {
        id: "peer-plain",
        label: "Peer Plain",
        description:
          "An open training field with readable space for peer compute, gradient paths, and parameter-soil patches.",
        anchor: { xRatio: 0.68, yRatio: 0.48 },
        radiusTiles: 38,
        terrains: [
          { terrainId: "plain", weight: 1 },
          { terrainId: "path", weight: 0.62 },
          { terrainId: "stone", weight: 0.34 },
          { terrainId: "dirt", weight: 0.26 },
          { terrainId: "grass", weight: 0.24 },
        ],
        plants: [
          {
            plantId: "gensyn-gradient-vine",
            weight: 0.28,
            terrainIds: ["path", "grass", "dirt"],
          },
          {
            plantId: "gensyn-peer-clover",
            weight: 0.32,
            terrainIds: ["plain", "grass", "dirt"],
          },
          {
            plantId: "gensyn-proof-pine",
            weight: 0.16,
            terrainIds: ["stone", "grass"],
          },
        ],
        objects: [
          {
            objectId: "gensyn-checkpoint-grass",
            weight: 0.32,
            terrainIds: ["path", "grass"],
          },
          {
            objectId: "gensyn-gradient-clover",
            weight: 0.24,
            terrainIds: ["plain", "grass"],
          },
          {
            objectId: "gensyn-metric-pebbles",
            weight: 0.18,
            terrainIds: ["dirt", "stone", "path"],
          },
        ],
        connections: [
          "model-lake",
          "gradient-grove",
          "proof-marsh",
          "research-ridge",
        ],
      },
      {
        id: "proof-marsh",
        label: "Proof Marsh",
        description:
          "A wet verification region with amber proof pools, signal reeds, and heavy dark-green moisture.",
        anchor: { xRatio: 0.76, yRatio: 0.7 },
        radiusTiles: 42,
        terrains: [
          { terrainId: "swamp", weight: 1.22 },
          { terrainId: "water", weight: 0.62 },
          { terrainId: "sand", weight: 0.34 },
          { terrainId: "forest-floor", weight: 0.42 },
          { terrainId: "grass", weight: 0.2 },
          { terrainId: "stone", weight: 0.22 },
        ],
        plants: [
          {
            plantId: "gensyn-proof-reed",
            weight: 0.36,
            terrainIds: ["water", "swamp"],
          },
          {
            plantId: "gensyn-moonwillow",
            weight: 0.42,
            terrainIds: ["swamp", "forest-floor", "sand"],
          },
          {
            plantId: "gensyn-tickbloom",
            weight: 0.22,
            terrainIds: ["forest-floor", "swamp"],
          },
        ],
        objects: [
          {
            objectId: "gensyn-proof-marker",
            weight: 0.8,
            terrainIds: ["stone", "swamp"],
          },
          {
            objectId: "gensyn-signal-reeds",
            weight: 0.44,
            terrainIds: ["swamp", "water", "sand"],
          },
        ],
        connections: [
          "model-lake",
          "gradient-grove",
          "peer-plain",
          "research-ridge",
        ],
      },
      {
        id: "research-ridge",
        label: "Research Ridge",
        description:
          "A sparse proof-stone ridge for exact paths, small verification outcrops, and quiet high-ground compute.",
        anchor: { xRatio: 0.58, yRatio: 0.2 },
        radiusTiles: 30,
        terrains: [
          { terrainId: "stone", weight: 0.74 },
          { terrainId: "path", weight: 0.5 },
          { terrainId: "plain", weight: 0.42 },
          { terrainId: "dirt", weight: 0.18 },
          { terrainId: "grass", weight: 0.16 },
        ],
        plants: [
          {
            plantId: "gensyn-proof-pine",
            weight: 0.26,
            terrainIds: ["stone", "grass"],
          },
          {
            plantId: "gensyn-gradient-vine",
            weight: 0.18,
            terrainIds: ["path", "grass", "dirt"],
          },
        ],
        objects: [
          {
            objectId: "gensyn-metric-pebbles",
            weight: 0.28,
            terrainIds: ["dirt", "stone", "path"],
          },
          {
            objectId: "gensyn-checkpoint-grass",
            weight: 0.24,
            terrainIds: ["path", "grass"],
          },
        ],
        connections: [
          "model-lake",
          "gradient-grove",
          "peer-plain",
          "proof-marsh",
        ],
      },
    ],
    worldGeneration: {
      seed: 6072025,
      spawnClearingRadius: 11,
      treePlantIds: [
        "gensyn-modelbloom",
        "gensyn-tickbloom",
        "gensyn-proof-pine",
        "gensyn-moonwillow",
      ],
    },
  },
};
