import type { System } from "../../ecs/System";
import type { World } from "../../ecs/World";
import { TerrainCursor } from "../components/TerrainCursor";
import { TerrainGrid } from "../components/TerrainGrid";
import { TerrainPainter } from "../components/TerrainPainter";
import { pointerToCell } from "./TerrainPaintSystem";

export class TerrainCursorSystem implements System {
  update(world: World): void {
    for (const [, grid, painter, cursor] of world.query(TerrainGrid, TerrainPainter, TerrainCursor)) {
      cursor.graphics.clear();

      const scene = cursor.graphics.scene;
      const cell = pointerToCell(scene, grid, scene.input.activePointer);

      if (!cell) {
        continue;
      }

      cursor.graphics.lineStyle(2, painter.activeTool === "paint" ? 0xffd080 : 0xf2f5f7, 0.95);
      cursor.graphics.strokeRect(
        cell.x * grid.tileSize + 1,
        cell.y * grid.tileSize + 1,
        grid.tileSize - 2,
        grid.tileSize - 2,
      );
    }
  }
}
