import {
  objectSpriteAssets,
  type ObjectSpriteAsset,
  type ObjectSpriteCell,
} from "../../assets/object-sprites/ObjectSpriteAssets";
import type { PlantStage } from "./components/PlantState";
import { getPlantBySeed } from "./PlantDefinitions";

export type PlantSpriteStateId = PlantStage | "harvested";

const plantSpriteRegistry: Record<string, ObjectSpriteAsset> = objectSpriteAssets;

export function getPlantSpriteAsset(plantId: string): ObjectSpriteAsset | undefined {
  return plantSpriteRegistry[plantId];
}

export function plantSpriteTextureKey(plantId: string): string {
  return `plant-sprite-${plantId}`;
}

export function getPlantSpriteAssetBySeed(seedId: string): ObjectSpriteAsset | undefined {
  const plant = getPlantBySeed(seedId);

  return plant ? getPlantSpriteAsset(plant.id) : undefined;
}

export function plantSpriteTextureKeyBySeed(seedId: string): string | undefined {
  const plant = getPlantBySeed(seedId);

  return plant ? plantSpriteTextureKey(plant.id) : undefined;
}

export function getPlantSpriteCell(
  asset: ObjectSpriteAsset,
  stage: PlantSpriteStateId,
  frame: number,
): ObjectSpriteCell | undefined {
  const stateId = stage === "fetched" ? "harvested" : stage;
  const column = frame % asset.manifest.columns;

  return asset.manifest.cells.find(
    (cell) => cell.stateId === stateId && cell.column === column,
  );
}

export function getPlantSpriteFrameIndex(
  asset: ObjectSpriteAsset,
  stage: PlantSpriteStateId,
  frame: number,
): number | undefined {
  const cell = getPlantSpriteCell(asset, stage, frame);

  return cell ? cell.row * asset.manifest.columns + cell.column : undefined;
}

export function getSeedItemSpriteFrameIndex(asset: ObjectSpriteAsset): number | undefined {
  return getPlantSpriteFrameIndex(asset, "seed", 0);
}

export function getHarvestItemSpriteFrameIndex(asset: ObjectSpriteAsset, _frame: number): number | undefined {
  return getPlantSpriteFrameIndex(asset, "harvested", 1);
}

export function getHarvestedPlantSpriteFrameIndex(asset: ObjectSpriteAsset, _frame: number): number | undefined {
  return getPlantSpriteFrameIndex(asset, "harvested", 0);
}
