import type { System } from "../../ecs/System";
import type { World } from "../../ecs/World";
import { FacingDirection } from "../components/FacingDirection";
import { GridTargetHighlight } from "../components/GridTargetHighlight";
import { PlayerControlled } from "../components/PlayerControlled";
import { Position } from "../components/Position";
import { TerrainGrid } from "../components/TerrainGrid";

export class GridTargetHighlightSystem implements System {
  update(world: World): void {
    const grid = world.query(TerrainGrid)[0]?.[1];

    if (!grid) {
      return;
    }

    for (const [, , position, facing, highlight] of world.query(
      PlayerControlled,
      Position,
      FacingDirection,
      GridTargetHighlight,
    )) {
      const playerTileX = Math.floor(position.x / grid.tileSize);
      const playerTileY = Math.floor(position.y / grid.tileSize);
      const localX = position.x - playerTileX * grid.tileSize;
      const localY = position.y - playerTileY * grid.tileSize;
      const crossesHorizontalHalf =
        (facing.x > 0 && localX >= grid.tileSize / 2) || (facing.x < 0 && localX < grid.tileSize / 2);
      const crossesVerticalHalf =
        (facing.y > 0 && localY >= grid.tileSize / 2) || (facing.y < 0 && localY < grid.tileSize / 2);
      const targetTileX = clamp(playerTileX + (crossesHorizontalHalf ? facing.x : 0), 0, grid.width - 1);
      const targetTileY = clamp(playerTileY + (crossesVerticalHalf ? facing.y : 0), 0, grid.height - 1);
      const left = targetTileX * grid.tileSize;
      const top = targetTileY * grid.tileSize;

      highlight.graphics.clear();
      highlight.graphics.fillStyle(0xfff3a1, 0.16);
      highlight.graphics.fillRect(left, top, grid.tileSize, grid.tileSize);
      highlight.graphics.lineStyle(8, 0xfff3a1, 0.9);
      highlight.graphics.strokeRect(left + 4, top + 4, grid.tileSize - 8, grid.tileSize - 8);
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
