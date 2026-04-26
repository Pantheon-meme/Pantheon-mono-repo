import type { System } from "../../ecs/System";
import type { World } from "../../ecs/World";
import { FacingDirection } from "../components/FacingDirection";
import { GridTargetHighlight } from "../components/GridTargetHighlight";
import { PlayerControlled } from "../components/PlayerControlled";
import { Position } from "../components/Position";
import { TerrainGrid } from "../components/TerrainGrid";
import { getFacingTargetCell } from "../terrain/GridTargeting";

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
      const targetCell = getFacingTargetCell(grid, position, facing);
      const left = targetCell.x * grid.tileSize;
      const top = targetCell.y * grid.tileSize;

      highlight.graphics.clear();
      highlight.graphics.fillStyle(0xfff3a1, 0.16);
      highlight.graphics.fillRect(left, top, grid.tileSize, grid.tileSize);
      highlight.graphics.lineStyle(8, 0xfff3a1, 0.9);
      highlight.graphics.strokeRect(
        left + 4,
        top + 4,
        grid.tileSize - 8,
        grid.tileSize - 8,
      );
    }
  }
}
