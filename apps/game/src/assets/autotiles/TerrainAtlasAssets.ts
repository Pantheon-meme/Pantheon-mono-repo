import dirtTerrainAtlasUrl from "./dirt/autotile-blob-7x7.png?url";
import uniswapDirtTerrainAtlasUrl from "./uniswap-dirt/autotile-blob-7x7.png?url";
import uniswapDirtTerrainCenterVariantsUrl from "./uniswap-dirt/center-variants-4x4.png?url";
import uniswapForestFloorTerrainAtlasUrl from "./uniswap-forest-floor/autotile-blob-7x7.png?url";
import uniswapForestFloorTerrainCenterVariantsUrl from "./uniswap-forest-floor/center-variants-4x4.png?url";
import uniswapGrassTerrainAtlasUrl from "./uniswap-grass/autotile-blob-7x7.png?url";
import uniswapGrassTerrainCenterVariantsUrl from "./uniswap-grass/center-variants-4x4.png?url";
import uniswapPathTerrainAtlasUrl from "./uniswap-path/autotile-blob-7x7.png?url";
import uniswapPathTerrainCenterVariantsUrl from "./uniswap-path/center-variants-4x4.png?url";
import uniswapPlainTerrainAtlasUrl from "./uniswap-plain/autotile-blob-7x7.png?url";
import uniswapPlainTerrainCenterVariantsUrl from "./uniswap-plain/center-variants-4x4.png?url";
import uniswapSandTerrainAtlasUrl from "./uniswap-sand/autotile-blob-7x7.png?url";
import uniswapSandTerrainCenterVariantsUrl from "./uniswap-sand/center-variants-4x4.png?url";
import uniswapStoneTerrainAtlasUrl from "./uniswap-stone/autotile-blob-7x7.png?url";
import uniswapStoneTerrainCenterVariantsUrl from "./uniswap-stone/center-variants-4x4.png?url";
import uniswapSwampTerrainAtlasUrl from "./uniswap-swamp/autotile-blob-7x7.png?url";
import uniswapSwampTerrainCenterVariantsUrl from "./uniswap-swamp/center-variants-4x4.png?url";
import uniswapWaterTerrainAtlasUrl from "./uniswap-water/autotile-blob-7x7.png?url";
import uniswapWaterTerrainCenterVariantsUrl from "./uniswap-water/center-variants-4x4.png?url";
import vibrantGrassTerrainAtlasUrl from "./vibrant-grass/autotile-blob-7x7.png?url";
import waterTerrainAtlasUrl from "./water/autotile-blob-7x7.png?url";

export type TerrainAtlasAssetId = string;

export type TerrainAtlasAsset = {
  id: TerrainAtlasAssetId;
  imageUrl: string;
  centerVariantsUrl?: string;
};

export const terrainAtlasAssets: Record<TerrainAtlasAssetId, TerrainAtlasAsset> = {
  "dirt": {
    id: "dirt",
    imageUrl: dirtTerrainAtlasUrl,
  },
  "uniswap-dirt": {
    id: "uniswap-dirt",
    imageUrl: uniswapDirtTerrainAtlasUrl,
    centerVariantsUrl: uniswapDirtTerrainCenterVariantsUrl,
  },
  "uniswap-forest-floor": {
    id: "uniswap-forest-floor",
    imageUrl: uniswapForestFloorTerrainAtlasUrl,
    centerVariantsUrl: uniswapForestFloorTerrainCenterVariantsUrl,
  },
  "uniswap-grass": {
    id: "uniswap-grass",
    imageUrl: uniswapGrassTerrainAtlasUrl,
    centerVariantsUrl: uniswapGrassTerrainCenterVariantsUrl,
  },
  "uniswap-path": {
    id: "uniswap-path",
    imageUrl: uniswapPathTerrainAtlasUrl,
    centerVariantsUrl: uniswapPathTerrainCenterVariantsUrl,
  },
  "uniswap-plain": {
    id: "uniswap-plain",
    imageUrl: uniswapPlainTerrainAtlasUrl,
    centerVariantsUrl: uniswapPlainTerrainCenterVariantsUrl,
  },
  "uniswap-sand": {
    id: "uniswap-sand",
    imageUrl: uniswapSandTerrainAtlasUrl,
    centerVariantsUrl: uniswapSandTerrainCenterVariantsUrl,
  },
  "uniswap-stone": {
    id: "uniswap-stone",
    imageUrl: uniswapStoneTerrainAtlasUrl,
    centerVariantsUrl: uniswapStoneTerrainCenterVariantsUrl,
  },
  "uniswap-swamp": {
    id: "uniswap-swamp",
    imageUrl: uniswapSwampTerrainAtlasUrl,
    centerVariantsUrl: uniswapSwampTerrainCenterVariantsUrl,
  },
  "uniswap-water": {
    id: "uniswap-water",
    imageUrl: uniswapWaterTerrainAtlasUrl,
    centerVariantsUrl: uniswapWaterTerrainCenterVariantsUrl,
  },
  "vibrant-grass": {
    id: "vibrant-grass",
    imageUrl: vibrantGrassTerrainAtlasUrl,
  },
  "water": {
    id: "water",
    imageUrl: waterTerrainAtlasUrl,
  },
};

export function getTerrainAtlasAsset(
  assetId: TerrainAtlasAssetId,
): TerrainAtlasAsset {
  return (
    terrainAtlasAssets[assetId] ??
    terrainAtlasAssets["uniswap-plain"] ??
    terrainAtlasAssets["vibrant-grass"]
  );
}

export function terrainAtlasTextureKey(assetId: TerrainAtlasAssetId): string {
  return `terrain-atlas-${assetId}`;
}

export function terrainCenterVariantTextureKey(
  assetId: TerrainAtlasAssetId,
): string {
  return `terrain-center-variants-${assetId}`;
}
