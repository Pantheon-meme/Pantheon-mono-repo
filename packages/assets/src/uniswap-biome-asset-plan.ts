export type BiomeObjectSpriteDefinition = {
  id: string;
  name: string;
  row: number;
  column: number;
  prompt: string;
};

export type BiomeObjectSheetDefinition = {
  id: string;
  name: string;
  regionId?: string;
  styleReferenceTerrainId: string;
  prompt: string;
  objects: BiomeObjectSpriteDefinition[];
};

export type BiomePlantSpriteDefinition = {
  id: string;
  name: string;
  kind: "plant" | "tree";
  regionId: string;
  terrainIds: string[];
  styleReferenceTerrainId: string;
  prompt: string;
};

export const uniswapBiomeCreativeBrief = [
  "Uniswap Commons is a simplified branded biome made from four readable regions: a big liquidity lake, an enchanted forest, a flat city plain, and an oracle swamp.",
  "The terrain set is deliberately simple: plain, water, sand, grass, dirt, forest floor, path, stone, and swamp.",
  "Terrain is the habitat authority: water gets reeds, lily blooms, marker stones, and shoreline objects; forest floor gets several tree types, bushes, logs, roots, mushrooms, and stones; the flat city plain gets paths, stone, planters, civic props, and readable open space; swamp gets reeds, glassy puddles, moss, crystals, and wetland plants.",
  "Art direction: cozy hand-painted 2D game art, three-quarter top-down, readable silhouettes, Uniswap-inspired violet, mint, pearl, pink, cyan, teal, and lavender-gray palette, no logos, no readable text, no UI.",
].join(" ");

export const uniswapBaseObjectSheetId = "uniswap-nature-props";

export const uniswapBiomeObjectSheets: BiomeObjectSheetDefinition[] = [
  {
    id: uniswapBaseObjectSheetId,
    name: "Uniswap Nature Props",
    styleReferenceTerrainId: "uniswap-grass",
    prompt:
      "Shared natural Uniswap biome scatter props for grass, dirt, sand, forest floor, stone, swamp, and lake edges.",
    objects: [
      object("violet-clover-bush", "Violet Clover Bush", 0, 0, "dense violet clover bush with mint leaf tips, pearl dew, and a rounded playable silhouette"),
      object("mint-moss-stone", "Mint Moss Stone", 0, 1, "small lavender-gray field stone partly covered in mint moss and violet clover"),
      object("pearl-sand-shells", "Pearl Sand Shells", 0, 2, "tiny pearl shell and lavender pebble cluster for lake sand edges"),
      object("oracle-glass-crystal", "Oracle Glass Crystal", 0, 3, "transparent cyan oracle glass crystal growing from damp moss"),
      object("liquidity-reeds", "Liquidity Reeds", 1, 0, "thin teal reeds with pink seed tips for water and swamp edges"),
      object("route-silk-grass", "Route Silk Grass", 1, 1, "tuft of pearly route-silk grass braided through mint leaves"),
      object("fee-moss-mushrooms", "Fee Moss Mushrooms", 1, 2, "small stepped mint, teal, and violet mushroom cluster"),
      object("unicorn-flower-clump", "Unicorn Flower Clump", 1, 3, "violet and unicorn-pink meadow flowers with mint leaves"),
      object("swapstone-pebbles", "Swapstone Pebbles", 2, 0, "rose-quartz swapstone pebbles with powdered lavender dust"),
      object("fallen-unicorn-branch", "Fallen Unicorn Branch", 2, 1, "fallen pale mint branch with pink fronds and pearl seed pods"),
      object("liquidity-puddle", "Liquidity Puddle", 2, 2, "tiny shallow teal puddle with pink and violet paired currents"),
      object("governance-stone-outcrop", "Governance Stone Outcrop", 2, 3, "natural lavender-gray stone outcrop with flat worn tops and mint moss seams"),
      object("forest-root-cluster", "Forest Root Cluster", 3, 0, "exposed mint roots curling through dark violet forest floor"),
      object("pink-thistle", "Pink Thistle", 3, 1, "small unicorn-pink thistle with soft spiky violet leaves"),
      object("swamp-bubble-moss", "Swamp Bubble Moss", 3, 2, "wet mint moss pad with tiny cyan bubbles and pink wetland dots"),
      object("violet-log", "Violet Log", 3, 3, "short fallen violet-brown log with mint moss and tiny pink fungi"),
    ],
  },
  regionSheet("uniswap-lake-props", "Uniswap Lake Props", "liquidity-lake", "uniswap-water", [
    "paired current ripple", "floating poolblossom", "teal reed fan", "pearl sand stone",
    "mint pink marker stones", "liquidity lily pad", "small shore shell cluster", "wet clover tuft",
    "transparent water bead", "violet bank grass", "round pool pebble", "soft cyan puddle",
    "pink current foam", "shoreline moss tuft", "tiny opal fish shadow", "lake pearl cluster",
  ]),
  regionSheet("uniswap-forest-props", "Uniswap Forest Props", "unicorn-forest", "uniswap-forest-floor", [
    "violet clover bush", "mint moss boulder", "fallen unicorn branch", "forest root knot",
    "pink cap mushrooms", "pearl dew leaf pile", "small governance stone", "route vine curl",
    "shadow fern clump", "soft clover bramble", "forest floor flowers", "tiny moss lantern fungus",
    "lavender pebble stack", "mint bark chip", "thick root arch", "unicorn seed pod cluster",
  ]),
  regionSheet("uniswap-city-props", "Uniswap City Props", "swap-city-plain", "uniswap-stone", [
    "round swap plaza stone", "governance arch", "liquidity lantern", "clover planter",
    "route signpost without text", "proposal table", "oracle mirror pedestal", "path lantern chain",
    "builder blanket", "poolside cushions", "governance bell", "clover sundial",
    "flat stone bench", "mint flower urn", "route braid basket", "pearl civic stones",
  ]),
  regionSheet("uniswap-swamp-props", "Uniswap Swamp Props", "oracle-swamp", "uniswap-swamp", [
    "oracle glass shard", "cyan swamp reeds", "mirror moss pad", "dark teal puddle",
    "pink bubble cluster", "wet root claw", "violet swamp flower", "mint silt stone",
    "floating glass leaf", "swamp pearl fungus", "small data ripple", "mossy crystal splinter",
    "low swamp fern", "poolbank sponge moss", "wetland thistle", "tiny oracle bloom",
  ]),
];

export const uniswapBiomePlantSprites: BiomePlantSpriteDefinition[] = [
  plant("poolblossom", "Poolblossom", "plant", "liquidity-lake", ["uniswap-water", "uniswap-sand"], "uniswap-water", "floating pink-violet pool flower with teal pads, pearl droplets, and paired-current glow"),
  plant("liquidity-reed", "Liquidity Reed", "plant", "liquidity-lake", ["uniswap-water", "uniswap-sand"], "uniswap-water", "low teal reed cluster with violet grass base and unicorn-pink seed tips"),
  plant("routeberry", "Routeberry", "plant", "swap-city-plain", ["uniswap-path", "uniswap-grass", "uniswap-dirt"], "uniswap-path", "low routeberry vine crop with pearly braided tendrils, pink berries, and mint leaves"),
  plant("city-clover", "City Clover", "plant", "swap-city-plain", ["uniswap-plain", "uniswap-grass"], "uniswap-plain", "short violet clover patch with mint leaves and pearl dew, kept low for readable city space"),
  plant("swamp-orchid", "Swamp Orchid", "plant", "oracle-swamp", ["uniswap-swamp"], "uniswap-swamp", "small wetland orchid with cyan glass dew, pink petals, and dark teal moss roots"),
  plant("mirror-reed", "Mirror Reed", "plant", "oracle-swamp", ["uniswap-swamp", "uniswap-water"], "uniswap-swamp", "reflective cyan reed and mirror moss plant, low wetland silhouette"),
  plant("unicornwillow", "Unicornwillow", "tree", "unicorn-forest", ["uniswap-forest-floor", "uniswap-grass"], "uniswap-forest-floor", "signature Uniswap forest tree with pale mint bark, unicorn-pink fronds, pearl pods, and open readable canopy"),
  plant("tickbloom", "Tickbloom", "tree", "unicorn-forest", ["uniswap-forest-floor"], "uniswap-forest-floor", "tiered violet and teal bloom tree, mushroom-like canopy clusters and mint moss roots"),
  plant("moonwillow", "Moonwillow", "tree", "unicorn-forest", ["uniswap-forest-floor", "uniswap-swamp"], "uniswap-forest-floor", "silvery moonlit willow with cyan dew, drooping violet fronds, and damp mint roots"),
  plant("starblossom", "Starblossom", "tree", "unicorn-forest", ["uniswap-forest-floor", "uniswap-grass"], "uniswap-forest-floor", "violet star-flowered tree with pearl highlights and soft lavender trunk"),
  plant("poolcypress", "Poolcypress", "tree", "unicorn-forest", ["uniswap-forest-floor", "uniswap-water", "uniswap-swamp"], "uniswap-forest-floor", "teal pool-edge cypress with curved mint roots, pink current beads, and sparse elegant canopy"),
  plant("stonepine", "Stonepine", "tree", "swap-city-plain", ["uniswap-stone", "uniswap-grass"], "uniswap-stone", "small sculptural city tree rooted near governance stone, lavender bark and mint-violet needle clusters"),
];

function object(
  id: string,
  name: string,
  row: number,
  column: number,
  prompt: string,
): BiomeObjectSpriteDefinition {
  return { id, name, row, column, prompt };
}

function regionSheet(
  id: string,
  name: string,
  regionId: string,
  styleReferenceTerrainId: string,
  objectNames: string[],
): BiomeObjectSheetDefinition {
  return {
    id,
    name,
    regionId,
    styleReferenceTerrainId,
    prompt: `${name} for ${regionId}; every object should be a separate terrain-matched prop that makes the simplified region feel finished and resource-rich.`,
    objects: objectNames.map((name, index) =>
      object(
        `${id}-${slug(name)}`,
        titleCase(name),
        Math.floor(index / 4),
        index % 4,
        `${name}, natural top-down Uniswap biome prop, readable small silhouette, belongs specifically to ${regionId}`,
      ),
    ),
  };
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
  return { id, name, kind, regionId, terrainIds, styleReferenceTerrainId, prompt };
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function titleCase(value: string): string {
  return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}
