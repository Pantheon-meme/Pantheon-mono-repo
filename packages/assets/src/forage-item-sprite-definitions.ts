export type ForageItemSpriteDefinition = {
  itemId: string;
  name: string;
  prompt: string;
};

export type ForageItemSpriteSheetDefinition = {
  id: string;
  name: string;
  styleReferenceTerrainId: string;
  items: ForageItemSpriteDefinition[];
};

export const forageItemSpriteSheets: ForageItemSpriteSheetDefinition[] = [
  {
    id: "forage-resources-a",
    name: "Forage Resources A",
    styleReferenceTerrainId: "uniswap-grass",
    items: [
      item("wild_fiber", "Wild fiber", "loose bundle of mint-green wild grass fiber tied by a tiny violet strand"),
      item("violet_clover", "Violet clover", "small violet clover sprig with three rounded leaves and pearl dew"),
      item("pearl_dew", "Pearl dew", "single luminous pearl dew droplet cupped in two tiny mint leaves"),
      item("unicorn_petal", "Unicorn petal", "soft unicorn-pink petal with a pale mint vein and subtle sparkle"),
      item("forest_root", "Forest root", "curled dark violet-brown forest root with moss tips"),
      item("fee_moss_mushroom", "Fee moss mushroom", "small mint moss mushroom cap with lavender underside"),
      item("fallen_unicorn_branch", "Fallen unicorn branch", "short pale branch with pink fronds and pearl buds"),
      item("bubble_moss", "Bubble moss", "teal moss clump with round pink pool bubbles"),
      item("oracle_silt", "Oracle silt", "small pinch of dark teal oracle mud with cyan glass flecks"),
      item("glassy_spore", "Glassy spore", "transparent cyan spore pod with violet shadow"),
      item("pearl_shell", "Pearl shell", "small pale pearl shell with lavender inner shine"),
      item("lake_glass_pebble", "Lake glass pebble", "smooth translucent teal lake-glass pebble"),
      item("swapstone_dust", "Swapstone dust", "tiny mound of pink-lavender quartz dust with spark glints"),
      item("swapstone_pebble", "Swapstone pebble", "rounded rose swapstone pebble with violet edge"),
      item("governance_stone_chip", "Governance stone chip", "flat lavender-gray civic stone chip with mint moss seam"),
      item("route_silk_fiber", "Route silk fiber", "thin pearly route-silk thread curled into a small loop"),
    ],
  },
  {
    id: "forage-resources-b",
    name: "Forage Resources B",
    styleReferenceTerrainId: "uniswap-swamp",
    items: [
      item("marker_pebble", "Marker pebble", "small mint marker pebble with a pale route notch"),
      item("oracle_glass_crystal", "Oracle glass crystal", "tiny cyan oracle crystal shard with violet base"),
      item("copper_ore", "Copper ore", "small copper ore nugget with warm orange metal glints"),
      item("opal_gem", "Opal gem", "small opal gem with pearl, pink, teal, and violet fire"),
      item("mint_reed_fiber", "Mint reed fiber", "fresh mint reed fiber bundle with wet teal tips"),
      item("pearl_moss", "Pearl moss", "soft pearl moss tuft dotted with lavender dew beads"),
      item("violet_mycela", "Violet mycela", "curling violet mushroom-thread cluster with pale cyan tips"),
      item("glass_reed_shard", "Glass reed shard", "thin translucent reed shard like cyan glass grass"),
      item("liquidity_algae", "Liquidity algae", "small teal algae swirl with pink and violet currents"),
      item("rose_quartz_chip", "Rose quartz chip", "tiny rose quartz mineral chip with faceted pink edge"),
      item("civic_clay", "Civic clay", "small smooth lavender clay lump with mint speckle"),
      item("route_thread_spool", "Route thread spool", "mini pearly thread spool wrapped with route-silk"),
      item("swamp_glass_nodule", "Swamp glass nodule", "rounded dark teal glass nodule with cyan glow"),
      item("oracle_amber", "Oracle amber", "small honey-cyan amber bead with suspended violet fleck"),
      item("pool_pearl", "Pool pearl", "round pool pearl with teal reflection and pink highlight"),
      item("moonlit_bark", "Moonlit bark", "small moonlit bark flake in lavender-gray and pale mint"),
    ],
  },
];

function item(
  itemId: string,
  name: string,
  prompt: string,
): ForageItemSpriteDefinition {
  return { itemId, name, prompt };
}
