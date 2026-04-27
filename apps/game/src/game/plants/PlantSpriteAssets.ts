import {
  objectSpriteAssets,
  type ObjectSpriteAsset,
  type ObjectSpriteCell,
} from "../../assets/object-sprites/ObjectSpriteAssets";
import type { PlantStage } from "./components/PlantState";

const plantSpriteRegistry: Record<string, ObjectSpriteAsset> = objectSpriteAssets;

export function getPlantSpriteAsset(plantId: string): ObjectSpriteAsset | undefined {
  return plantSpriteRegistry[plantId];
}

export function plantSpriteTextureKey(plantId: string): string {
  return `plant-sprite-${plantId}`;
}

export function getPlantSpriteCell(
  asset: ObjectSpriteAsset,
  stage: PlantStage | "harvested",
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
  stage: PlantStage | "harvested",
  frame: number,
): number | undefined {
  const cell = getPlantSpriteCell(asset, stage, frame);

  return cell ? cell.row * asset.manifest.columns + cell.column : undefined;
}
