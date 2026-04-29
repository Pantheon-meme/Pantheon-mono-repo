import dirtAtlasUrl from "./dirt/autotile-blob-7x7.png?url";
import uniswapFeeTierMossAtlasUrl from "./uniswap-fee-tier-moss/autotile-blob-7x7.png?url";
import uniswapGovernanceStoneAtlasUrl from "./uniswap-governance-stone/autotile-blob-7x7.png?url";
import uniswapLiquidityPoolAtlasUrl from "./uniswap-liquidity-pool/autotile-blob-7x7.png?url";
import uniswapOracleGlassAtlasUrl from "./uniswap-oracle-glass/autotile-blob-7x7.png?url";
import uniswapRouteSilkAtlasUrl from "./uniswap-route-silk/autotile-blob-7x7.png?url";
import uniswapSwapstoneDustAtlasUrl from "./uniswap-swapstone-dust/autotile-blob-7x7.png?url";
import uniswapV3CloverAtlasUrl from "./uniswap-v3-clover/autotile-blob-7x7.png?url";
import vibrantGrassAtlasUrl from "./vibrant-grass/autotile-blob-7x7.png?url";
import waterAtlasUrl from "./water/autotile-blob-7x7.png?url";

export type TerrainAtlasAssetId =
  | "dirt"
  | "uniswap-fee-tier-moss"
  | "uniswap-governance-stone"
  | "uniswap-liquidity-pool"
  | "uniswap-oracle-glass"
  | "uniswap-route-silk"
  | "uniswap-swapstone-dust"
  | "uniswap-v3-clover"
  | "vibrant-grass"
  | "water";

export type TerrainAtlasAsset = {
  id: TerrainAtlasAssetId;
  imageUrl: string;
};

export const terrainAtlasAssets: Record<
  TerrainAtlasAssetId,
  TerrainAtlasAsset
> = {
  dirt: {
    id: "dirt",
    imageUrl: dirtAtlasUrl,
  },
  "uniswap-fee-tier-moss": {
    id: "uniswap-fee-tier-moss",
    imageUrl: uniswapFeeTierMossAtlasUrl,
  },
  "uniswap-governance-stone": {
    id: "uniswap-governance-stone",
    imageUrl: uniswapGovernanceStoneAtlasUrl,
  },
  "uniswap-liquidity-pool": {
    id: "uniswap-liquidity-pool",
    imageUrl: uniswapLiquidityPoolAtlasUrl,
  },
  "uniswap-oracle-glass": {
    id: "uniswap-oracle-glass",
    imageUrl: uniswapOracleGlassAtlasUrl,
  },
  "uniswap-route-silk": {
    id: "uniswap-route-silk",
    imageUrl: uniswapRouteSilkAtlasUrl,
  },
  "uniswap-swapstone-dust": {
    id: "uniswap-swapstone-dust",
    imageUrl: uniswapSwapstoneDustAtlasUrl,
  },
  "uniswap-v3-clover": {
    id: "uniswap-v3-clover",
    imageUrl: uniswapV3CloverAtlasUrl,
  },
  "vibrant-grass": {
    id: "vibrant-grass",
    imageUrl: vibrantGrassAtlasUrl,
  },
  water: {
    id: "water",
    imageUrl: waterAtlasUrl,
  },
};

export function terrainAtlasTextureKey(assetId: TerrainAtlasAssetId): string {
  return `terrain-atlas-${assetId}`;
}
