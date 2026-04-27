import { FacingDirection } from "../player/components/FacingDirection";
import { Position } from "../shared/components/Position";
import { TerrainGrid } from "./components/TerrainGrid";

export type TerrainCell = {
  x: number;
  y: number;
};

export function getFacingTargetCell(
  grid: TerrainGrid,
  position: Position,
  facing: FacingDirection,
): TerrainCell {
  const playerTileX = Math.floor(position.x / grid.tileSize);
  const playerTileY = Math.floor(position.y / grid.tileSize);
  const localX = position.x - playerTileX * grid.tileSize;
  const localY = position.y - playerTileY * grid.tileSize;
  const crossesHorizontalHalf =
    (facing.x > 0 && localX >= grid.tileSize / 2) ||
    (facing.x < 0 && localX < grid.tileSize / 2);
  const crossesVerticalHalf =
    (facing.y > 0 && localY >= grid.tileSize / 2) ||
    (facing.y < 0 && localY < grid.tileSize / 2);

  return {
    x: clamp(
      playerTileX + (crossesHorizontalHalf ? facing.x : 0),
      0,
      grid.width - 1,
    ),
    y: clamp(
      playerTileY + (crossesVerticalHalf ? facing.y : 0),
      0,
      grid.height - 1,
    ),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
