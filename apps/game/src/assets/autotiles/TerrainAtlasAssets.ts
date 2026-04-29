import dirtAtlasUrl from "./dirt/autotile-blob-7x7.png?url";
import uniswapFeeTierMossAtlasUrl from "./uniswap-fee-tier-moss/autotile-blob-7x7.png?url";
import uniswapFeeTierMossCenterVariantsUrl from "./uniswap-fee-tier-moss/center-variants-4x4.png?url";
import uniswapGovernanceStoneAtlasUrl from "./uniswap-governance-stone/autotile-blob-7x7.png?url";
import uniswapGovernanceStoneCenterVariantsUrl from "./uniswap-governance-stone/center-variants-4x4.png?url";
import uniswapLiquidityPoolAtlasUrl from "./uniswap-liquidity-pool/autotile-blob-7x7.png?url";
import uniswapLiquidityPoolCenterVariantsUrl from "./uniswap-liquidity-pool/center-variants-4x4.png?url";
import uniswapOracleGlassAtlasUrl from "./uniswap-oracle-glass/autotile-blob-7x7.png?url";
import uniswapOracleGlassCenterVariantsUrl from "./uniswap-oracle-glass/center-variants-4x4.png?url";
import uniswapRouteSilkAtlasUrl from "./uniswap-route-silk/autotile-blob-7x7.png?url";
import uniswapRouteSilkCenterVariantsUrl from "./uniswap-route-silk/center-variants-4x4.png?url";
import uniswapSwapstoneDustAtlasUrl from "./uniswap-swapstone-dust/autotile-blob-7x7.png?url";
import uniswapSwapstoneDustCenterVariantsUrl from "./uniswap-swapstone-dust/center-variants-4x4.png?url";
import uniswapV3CloverAtlasUrl from "./uniswap-v3-clover/autotile-blob-7x7.png?url";
import uniswapV3CloverCenterVariantsUrl from "./uniswap-v3-clover/center-variants-4x4.png?url";
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
  centerVariantsUrl?: string;
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
    centerVariantsUrl: uniswapFeeTierMossCenterVariantsUrl,
  },
  "uniswap-governance-stone": {
    id: "uniswap-governance-stone",
    imageUrl: uniswapGovernanceStoneAtlasUrl,
    centerVariantsUrl: uniswapGovernanceStoneCenterVariantsUrl,
  },
  "uniswap-liquidity-pool": {
    id: "uniswap-liquidity-pool",
    imageUrl: uniswapLiquidityPoolAtlasUrl,
    centerVariantsUrl: uniswapLiquidityPoolCenterVariantsUrl,
  },
  "uniswap-oracle-glass": {
    id: "uniswap-oracle-glass",
    imageUrl: uniswapOracleGlassAtlasUrl,
    centerVariantsUrl: uniswapOracleGlassCenterVariantsUrl,
  },
  "uniswap-route-silk": {
    id: "uniswap-route-silk",
    imageUrl: uniswapRouteSilkAtlasUrl,
    centerVariantsUrl: uniswapRouteSilkCenterVariantsUrl,
  },
  "uniswap-swapstone-dust": {
    id: "uniswap-swapstone-dust",
    imageUrl: uniswapSwapstoneDustAtlasUrl,
    centerVariantsUrl: uniswapSwapstoneDustCenterVariantsUrl,
  },
  "uniswap-v3-clover": {
    id: "uniswap-v3-clover",
    imageUrl: uniswapV3CloverAtlasUrl,
    centerVariantsUrl: uniswapV3CloverCenterVariantsUrl,
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

export function terrainCenterVariantTextureKey(
  assetId: TerrainAtlasAssetId,
): string {
  return `terrain-center-variants-${assetId}`;
}
