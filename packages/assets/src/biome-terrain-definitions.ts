export type BiomeTerrainAssetDefinition = {
  id: string;
  material: string;
  texture: string;
  sampleStyleAtlasId: string;
};

const calmerTerrainTextureDirection =
  "use larger 2x-scale readable shapes, fewer tiny repeated flecks, lower micro-detail density, clear quiet negative space for characters and objects";

function calmerTerrainTexture(texture: string): string {
  return `${texture}; ${calmerTerrainTextureDirection}`;
}

const rawUniswapRegionTerrainAssets: BiomeTerrainAssetDefinition[] = [
  {
    id: "uniswap-plain",
    material: "soft Uniswap pearl plain",
    texture:
      "quiet pearl-lavender meadow ground with faint violet clover specks, mint dew, and open playable negative space for the city plain",
    sampleStyleAtlasId: "vibrant-grass",
  },
  {
    id: "uniswap-water",
    material: "Uniswap liquidity lake water",
    texture:
      "clear teal lake water with broad slow violet and unicorn-pink paired currents, opalescent highlights, calm readable shoreline edges",
    sampleStyleAtlasId: "water",
  },
  {
    id: "uniswap-sand",
    material: "pearl liquidity sand",
    texture:
      "pale pearl sand with soft lavender shadows, tiny mint shell flecks, faint pink tide arcs, readable beach and lakebank texture",
    sampleStyleAtlasId: "dirt",
  },
  {
    id: "uniswap-grass",
    material: "Uniswap violet clover grass",
    texture:
      "violet clover grass mixed with mint leaves, sparse pearl dew beads, and small unicorn-pink flower sparks",
    sampleStyleAtlasId: "vibrant-grass",
  },
  {
    id: "uniswap-dirt",
    material: "rose swapstone dirt",
    texture:
      "warm pink-lavender farmable soil with powdered quartz, small violet roots, and occasional mint mineral glints",
    sampleStyleAtlasId: "dirt",
  },
  {
    id: "uniswap-forest-floor",
    material: "Uniswap enchanted forest floor",
    texture:
      "deep violet leaf litter, mint moss cushions, fallen pink fronds, tiny mushrooms, and soft shaded clover gaps",
    sampleStyleAtlasId: "vibrant-grass",
  },
  {
    id: "uniswap-path",
    material: "luminous route path",
    texture:
      "thin pearly route-silk footpath braided through lavender dust, mint and pink glints, lightly worn walking marks",
    sampleStyleAtlasId: "dirt",
  },
  {
    id: "uniswap-stone",
    material: "lavender governance stone",
    texture:
      "flat lavender-gray civic stones with rounded worn edges, subtle violet seams, mint moss cracks, and pearl dew highlights",
    sampleStyleAtlasId: "dirt",
  },
  {
    id: "uniswap-swamp",
    material: "oracle liquidity swamp",
    texture:
      "dark teal-violet wetland mud with shallow cyan puddles, mirror-glass flecks, mint reeds, and pink pool bubbles",
    sampleStyleAtlasId: "water",
  },
];

export const uniswapRegionTerrainAssets: BiomeTerrainAssetDefinition[] =
  rawUniswapRegionTerrainAssets.map((asset) => ({
    ...asset,
    texture: calmerTerrainTexture(asset.texture),
  }));
