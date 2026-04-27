import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { TerrainCursor } from "../components/TerrainCursor";
import { TerrainGrid } from "../components/TerrainGrid";
import { TerrainMaterial } from "../components/TerrainMaterial";
import { TerrainPainter } from "../components/TerrainPainter";
import { pointerToCell } from "./TerrainPaintSystem";

export class TerrainCursorSystem implements System {
  update(world: World): void {
    const materials = world.query(TerrainGrid, TerrainMaterial);

    for (const [, painter, cursor] of world.query(
      TerrainPainter,
      TerrainCursor,
    )) {
      cursor.graphics.clear();

      const target = materials.find(
        ([, , material]) => material.id === painter.activeMaterialId,
      );

      if (!target) {
        continue;
      }

      const grid = target[1];
      const material = target[2];
      const scene = cursor.graphics.scene;
      const cell = pointerToCell(scene, grid, scene.input.activePointer);

      if (!cell) {
        continue;
      }

      cursor.graphics.lineStyle(2, material.cursorColor, 0.95);
      cursor.graphics.strokeRect(
        cell.x * grid.tileSize + 1,
        cell.y * grid.tileSize + 1,
        grid.tileSize - 2,
        grid.tileSize - 2,
      );
    }
  }
}
