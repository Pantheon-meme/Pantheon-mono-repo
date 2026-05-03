import type {
  BiomeObjectSheetDefinition,
  BiomePlantSpriteDefinition,
} from "./uniswap-biome-asset-plan.js";
import type { BiomeTerrainAssetDefinition } from "./biome-terrain-definitions.js";

export type ProtocolBiomeAssetPlan = {
  id: string;
  name: string;
  creativeBrief: string;
  terrainAssets: BiomeTerrainAssetDefinition[];
  objectSheets: BiomeObjectSheetDefinition[];
  plantSprites: BiomePlantSpriteDefinition[];
};

const terrainIds = [
  "plain",
  "grass",
  "forest-floor",
  "dirt",
  "sand",
  "stone",
  "swamp",
  "water",
  "path",
] as const;

const sampleStyleAtlasIds: Record<(typeof terrainIds)[number], string> = {
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

const zeroGCreativeBrief = [
  "0G Nexus is a branded biome for 0G, the blockchain for AI agents.",
  "It turns modular AI infrastructure into terrain: data availability lakes, compute groves, validator ridges, inference mires, storage shards, chainways, and relay props.",
  "Art direction: cozy hand-painted 2D game art, three-quarter top-down, readable silhouettes, black space, electric violet, neon cyan, hot magenta, luminous node grids, no logos, no readable text, no UI.",
].join(" ");

const gensynCreativeBrief = [
  "Gensyn Training Grounds is a branded biome for Gensyn's decentralized machine learning compute network.",
  "It turns peer training, proof verification, gradient descent, model lakes, research ridges, and distributed compute into natural game terrain.",
  "Art direction: cozy hand-painted 2D game art, three-quarter top-down, readable silhouettes, black and white base, bright green signal, amber verification light, clean research geometry, no logos, no readable text, no UI.",
].join(" ");

export const protocolBiomeAssetPlans: ProtocolBiomeAssetPlan[] = [
  {
    id: "0g",
    name: "0G Nexus",
    creativeBrief: zeroGCreativeBrief,
    terrainAssets: terrainAssets("0g", [
      [
        "plain",
        "quiet 0G black-violet substrate",
        "deep graphite plain with faint violet grid dust, cyan pin lights, and open playable negative space",
      ],
      [
        "grass",
        "electric 0G signal grass",
        "short cyan and violet fiber grass with sparse magenta packet sparks and soft black soil gaps",
      ],
      [
        "forest-floor",
        "modular compute grove floor",
        "dark violet leaf litter crossed by tiny circuit roots, cyan moss buffers, and magenta cache blooms",
      ],
      [
        "dirt",
        "farmable 0G shard dust",
        "black-lilac mineral soil with powdered glass shards, violet roots, and cyan data flecks",
      ],
      [
        "sand",
        "pale data availability sand",
        "cool silver sand with violet shadows, cyan checksum specks, and magenta tide arcs",
      ],
      [
        "stone",
        "black validator stone",
        "flat obsidian-purple slabs with cyan seams, magenta edge light, and worn modular corners",
      ],
      [
        "swamp",
        "glowing inference wetland",
        "dark violet wetland mud with shallow cyan inference pools, magenta bubbles, and fiber reeds",
      ],
      [
        "water",
        "0G data availability lake",
        "black glass water with broad cyan streams, violet depth, magenta packet glints, and calm readable shores",
      ],
      [
        "path",
        "luminous modular chainway",
        "thin cyan-violet route lines braided through black dust with magenta relay ticks and lightly worn travel marks",
      ],
    ]),
    objectSheets: [
      {
        id: "0g-nature-props",
        name: "0G Nature Props",
        regionId: "0g-nexus",
        styleReferenceTerrainId: "0g-grass",
        prompt:
          "A cost-efficient batch sheet of static natural 0G biome scatter props for data lakes, compute groves, validator ridges, chainways, and inference mires.",
        objects: [
          object(
            "0g-cache-crystals",
            "Cache Crystals",
            0,
            3,
            "transparent cyan and magenta cache crystals growing from dark violet moss",
          ),
          object(
            "0g-data-reeds",
            "Data Reeds",
            1,
            0,
            "thin cyan data reeds with violet stems and hot magenta packet tips",
          ),
          object(
            "0g-chainway-grass",
            "Chainway Grass",
            1,
            1,
            "tuft of cyan-violet route grass braided through black dust",
          ),
          object(
            "0g-shard-pebbles",
            "Shard Pebbles",
            2,
            0,
            "black-lilac glass shard pebble cluster with cyan flecks",
          ),
          object(
            "0g-relay-pylon",
            "Relay Pylon",
            2,
            3,
            "natural obsidian relay pylon with cyan seams and magenta glow, no symbols or text",
          ),
        ],
      },
    ],
    plantSprites: [
      plant(
        "0g-routevine",
        "0G Routevine",
        "plant",
        "validator-ridge",
        ["0g-path", "0g-grass", "0g-dirt"],
        "0g-path",
        "low relay vine with cyan tendrils, magenta packet berries, and dark violet leaves",
      ),
      plant(
        "0g-mirror-reed",
        "0G Mirror Reed",
        "plant",
        "data-availability-lake",
        ["0g-water", "0g-swamp"],
        "0g-water",
        "glassy cyan reed with violet wet roots and tiny magenta reflection beads",
      ),
      plant(
        "0g-packet-bloom",
        "0G Packet Bloom",
        "plant",
        "data-availability-lake",
        ["0g-water", "0g-sand"],
        "0g-water",
        "floating violet packet flower with cyan pads and hot magenta data sparks",
      ),
      plant(
        "0g-inference-orchid",
        "0G Inference Orchid",
        "plant",
        "inference-mire",
        ["0g-swamp"],
        "0g-swamp",
        "small wetland orchid with cyan inference dew and magenta petals rooted in black-violet moss",
      ),
      plant(
        "0g-moonwillow",
        "0G Moonwillow",
        "tree",
        "compute-grove",
        ["0g-forest-floor", "0g-swamp"],
        "0g-forest-floor",
        "silver-cyan willow with violet shadow fronds, modular roots, and tiny magenta data pods",
      ),
      plant(
        "0g-starcache",
        "0G Starcache",
        "tree",
        "compute-grove",
        ["0g-forest-floor", "0g-grass"],
        "0g-forest-floor",
        "violet star-canopy cache tree with cyan nodes and readable modular branch silhouette",
      ),
      plant(
        "0g-poolcypress",
        "0G Poolcypress",
        "tree",
        "data-availability-lake",
        ["0g-water", "0g-sand", "0g-swamp"],
        "0g-water",
        "cyan pool-edge cypress with black-violet roots and magenta current beads",
      ),
      plant(
        "0g-validator-pine",
        "0G Validator Pine",
        "tree",
        "validator-ridge",
        ["0g-stone", "0g-grass"],
        "0g-stone",
        "sculptural black validator pine with cyan seams and sparse magenta needle tips",
      ),
    ],
  },
  {
    id: "gensyn",
    name: "Gensyn Training Grounds",
    creativeBrief: gensynCreativeBrief,
    terrainAssets: terrainAssets("gensyn", [
      [
        "plain",
        "clean peer compute plain",
        "quiet charcoal and soft off-white ground with pale green signal dots, clean lab spacing, and open playable negative space",
      ],
      [
        "grass",
        "green training signal grass",
        "short bright green grass fibers mixed with white chalk flecks, tiny amber loss sparks, and charcoal soil gaps",
      ],
      [
        "forest-floor",
        "gradient descent grove floor",
        "dark leaf litter with green gradient strokes, white paper scraps, amber verification seeds, and soft model-root shadows",
      ],
      [
        "dirt",
        "farmable parameter soil",
        "warm charcoal-brown soil with fine white chalk, green root threads, and amber metric flecks",
      ],
      [
        "sand",
        "pale dataset sand",
        "off-white sand with clean charcoal shadows, small green index marks, and faint amber contour lines",
      ],
      [
        "stone",
        "proof verification stone",
        "flat black and off-white lab stones with green seams, amber proof marks, and precise worn edges",
      ],
      [
        "swamp",
        "verification marsh",
        "dark green-black wetland mud with shallow amber proof pools, white reflection flecks, and reed-like signal bars",
      ],
      [
        "water",
        "model training lake",
        "deep black-green water with broad clean green currents, white highlights, amber uncertainty glints, and readable shores",
      ],
      [
        "path",
        "thin gradient training path",
        "bright green route strokes braided through dark dust with small amber checkpoints and white chalk wear",
      ],
    ]),
    objectSheets: [
      {
        id: "gensyn-nature-props",
        name: "Gensyn Nature Props",
        regionId: "gensyn-training-grounds",
        styleReferenceTerrainId: "gensyn-grass",
        prompt:
          "A cost-efficient batch sheet of static natural Gensyn biome scatter props for peer plains, model lakes, gradient groves, proof marshes, and research ridges.",
        objects: [
          object(
            "gensyn-gradient-clover",
            "Gradient Clover",
            0,
            0,
            "bright green clover cluster with white chalk flecks and amber metric dew",
          ),
          object(
            "gensyn-signal-reeds",
            "Signal Reeds",
            1,
            0,
            "thin green proof reeds with off-white stems and amber tips",
          ),
          object(
            "gensyn-checkpoint-grass",
            "Checkpoint Grass",
            1,
            1,
            "low green path grass with tiny amber checkpoint beads, no icons or text",
          ),
          object(
            "gensyn-metric-pebbles",
            "Metric Pebbles",
            2,
            0,
            "small black and off-white pebble cluster with green seams and amber flecks",
          ),
          object(
            "gensyn-proof-marker",
            "Proof Marker",
            2,
            3,
            "natural proof-stone outcrop with green seams and amber verification glow, no symbols or text",
          ),
        ],
      },
    ],
    plantSprites: [
      plant(
        "gensyn-gradient-vine",
        "Gensyn Gradient Vine",
        "plant",
        "peer-plain",
        ["gensyn-path", "gensyn-grass", "gensyn-dirt"],
        "gensyn-path",
        "low green gradient vine with amber berries and chalk-white leaf edges",
      ),
      plant(
        "gensyn-peer-clover",
        "Gensyn Peer Clover",
        "plant",
        "peer-plain",
        ["gensyn-plain", "gensyn-grass"],
        "gensyn-plain",
        "short peer-field clover with bright green leaves, white chalk flecks, and amber dew",
      ),
      plant(
        "gensyn-proof-reed",
        "Gensyn Proof Reed",
        "plant",
        "proof-marsh",
        ["gensyn-water", "gensyn-swamp"],
        "gensyn-swamp",
        "reflective proof reed with green stalks, white highlights, and amber marsh beads",
      ),
      plant(
        "gensyn-modelbloom",
        "Gensyn Modelbloom",
        "tree",
        "gradient-grove",
        ["gensyn-forest-floor", "gensyn-grass"],
        "gensyn-forest-floor",
        "branching model canopy tree with bright green leaves, white underlight, and amber training nodes",
      ),
      plant(
        "gensyn-tickbloom",
        "Gensyn Tickbloom",
        "tree",
        "gradient-grove",
        ["gensyn-forest-floor"],
        "gensyn-forest-floor",
        "layered training-step tree with stacked green bloom clusters and amber metric buds",
      ),
      plant(
        "gensyn-proof-pine",
        "Gensyn Proof Pine",
        "tree",
        "research-ridge",
        ["gensyn-stone", "gensyn-grass"],
        "gensyn-stone",
        "sparse black proof pine with bright green needles and clean off-white bark edges",
      ),
      plant(
        "gensyn-moonwillow",
        "Gensyn Moonwillow",
        "tree",
        "proof-marsh",
        ["gensyn-swamp", "gensyn-forest-floor"],
        "gensyn-swamp",
        "wet-root willow with pale white-green fronds and soft amber proof droplets",
      ),
    ],
  },
];

export const allProtocolTerrainAssets = protocolBiomeAssetPlans.flatMap(
  (plan) => plan.terrainAssets,
);
export const allProtocolObjectSheets = protocolBiomeAssetPlans.flatMap(
  (plan) => plan.objectSheets,
);
export const allProtocolPlantSprites = protocolBiomeAssetPlans.flatMap(
  (plan) => plan.plantSprites,
);

function terrainAssets(
  prefix: string,
  assets: Array<
    [terrainId: (typeof terrainIds)[number], material: string, texture: string]
  >,
): BiomeTerrainAssetDefinition[] {
  return assets.map(([terrainId, material, texture]) => ({
    id: `${prefix}-${terrainId}`,
    material,
    texture,
    sampleStyleAtlasId: sampleStyleAtlasIds[terrainId],
  }));
}

function object(
  id: string,
  name: string,
  row: number,
  column: number,
  prompt: string,
) {
  return { id, name, row, column, prompt };
}

function plant(
  id: string,
  name: string,
  kind: "plant" | "tree",
  regionId: string,
  terrainIds: string[],
  styleReferenceTerrainId: string,
  prompt: string,
): BiomePlantSpriteDefinition {
  return {
    id,
    name,
    kind,
    regionId,
    terrainIds,
    styleReferenceTerrainId,
    prompt,
  };
}
