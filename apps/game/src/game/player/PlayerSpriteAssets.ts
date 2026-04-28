import {
  objectSpriteAssets,
  type ObjectSpriteAsset,
  type ObjectSpriteCell,
} from "../../assets/object-sprites/ObjectSpriteAssets";
import { plantSpriteTextureKey } from "../plants/PlantSpriteAssets";

export type PlayerSpriteDirection = "down" | "up" | "side";
export type PlayerSpriteAction = "idle" | "walk";
export type PlayerSpriteSpecialPose = "action" | "sleep";
type PlayerSpriteStateId = "idle_1" | "idle_2" | "move_1" | "move_2";

const playerSpriteRegistry: Record<string, ObjectSpriteAsset> =
  objectSpriteAssets;
const defaultPlayerSpriteId = "player";
const directionColumns: Record<PlayerSpriteDirection, number> = {
  down: 0,
  side: 1,
  up: 2,
};

export function getPlayerSpriteAsset(
  playerId = defaultPlayerSpriteId,
): ObjectSpriteAsset | undefined {
  return playerSpriteRegistry[playerId];
}

export function playerSpriteTextureKey(
  playerId = defaultPlayerSpriteId,
): string {
  return plantSpriteTextureKey(playerId);
}

export function getPlayerSpriteCell(
  asset: ObjectSpriteAsset,
  direction: PlayerSpriteDirection,
  action: PlayerSpriteAction,
  frame: number,
): ObjectSpriteCell | undefined {
  const stateId = getPlayerSpriteStateId(direction, action, frame);
  const column = directionColumns[direction];

  return asset.manifest.cells.find(
    (cell) => cell.stateId === stateId && cell.column === column,
  );
}

function getPlayerSpriteStateId(
  direction: PlayerSpriteDirection,
  action: PlayerSpriteAction,
  frame: number,
): PlayerSpriteStateId {
  if (action === "idle") {
    return frame % 2 === 0 ? "idle_1" : "idle_2";
  }

  if (direction === "side") {
    const sideWalkStates: PlayerSpriteStateId[] = [
      "move_1",
      "idle_1",
      "move_2",
      "idle_2",
    ];

    return sideWalkStates[frame % sideWalkStates.length] ?? "move_1";
  }

  return frame % 2 === 0 ? "move_1" : "move_2";
}

export function getPlayerSpriteFrameIndex(
  asset: ObjectSpriteAsset,
  direction: PlayerSpriteDirection,
  action: PlayerSpriteAction,
  frame: number,
): number | undefined {
  const cell = getPlayerSpriteCell(asset, direction, action, frame);

  return cell ? cell.row * asset.manifest.columns + cell.column : undefined;
}

export function getPlayerSpecialSpriteFrameIndex(
  asset: ObjectSpriteAsset,
  direction: PlayerSpriteDirection,
  pose: PlayerSpriteSpecialPose,
): number | undefined {
  const cell = asset.manifest.cells.find((candidate) => {
    if (candidate.columnLabel !== "action") {
      return false;
    }

    if (pose === "sleep") {
      return candidate.stateId === "move_2";
    }

    if (direction === "down") {
      return candidate.stateId === "idle_1";
    }

    if (direction === "side") {
      return candidate.stateId === "idle_2";
    }

    return candidate.stateId === "move_1";
  });

  return cell ? cell.row * asset.manifest.columns + cell.column : undefined;
}
