import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { FocusTarget } from "../../player/components/FocusTarget";
import { GridTargetHighlight } from "../components/GridTargetHighlight";
import { PlayerControlled } from "../../player/components/PlayerControlled";
import { TerrainGrid } from "../components/TerrainGrid";

export class GridTargetHighlightSystem implements System {
  update(world: World): void {
    const grid = world.query(TerrainGrid)[0]?.[1];

    if (!grid) {
      return;
    }

    for (const [, , focus, highlight] of world.query(
      PlayerControlled,
      FocusTarget,
      GridTargetHighlight,
    )) {
      highlight.graphics.clear();

      if (focus.kind === "object") {
        const left = focus.objectX - focus.objectWidth / 2;
        const top = focus.objectY - focus.objectHeight / 2;

        highlight.graphics.fillStyle(0x7bd7ff, 0.18);
        highlight.graphics.fillRect(
          left,
          top,
          focus.objectWidth,
          focus.objectHeight,
        );
        highlight.graphics.lineStyle(6, 0x7bd7ff, 0.95);
        highlight.graphics.strokeRect(
          left,
          top,
          focus.objectWidth,
          focus.objectHeight,
        );
        return;
      }

      const left = focus.tileX * grid.tileSize;
      const top = focus.tileY * grid.tileSize;

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
