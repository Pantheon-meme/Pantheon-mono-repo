import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { TerrainBaseLayer } from "../components/TerrainBaseLayer";
import { TerrainGrid } from "../components/TerrainGrid";

export class TerrainBaseRenderSystem implements System {
  update(world: World): void {
    for (const [, grid, layer] of world.query(TerrainGrid, TerrainBaseLayer)) {
      if (layer.rendered) {
        continue;
      }

      const worldWidth = grid.width * grid.tileSize;
      const worldHeight = grid.height * grid.tileSize;

      layer.graphics.clear();
      layer.graphics.fillStyle(layer.baseColor, 1);
      layer.graphics.fillRect(0, 0, worldWidth, worldHeight);

      for (let y = 0; y < grid.height; y += 1) {
        for (let x = 0; x < grid.width; x += 1) {
          const color =
            hash01(x, y) > 0.68 ? layer.variantColor : layer.baseColor;

          layer.graphics.fillStyle(color, 1);
          layer.graphics.fillRect(
            x * grid.tileSize,
            y * grid.tileSize,
            grid.tileSize,
            grid.tileSize,
          );
        }
      }

      layer.graphics.lineStyle(1, layer.shadowColor, 0.2);

      for (let x = 0; x <= grid.width; x += 1) {
        layer.graphics.lineBetween(
          x * grid.tileSize,
          0,
          x * grid.tileSize,
          worldHeight,
        );
      }

      for (let y = 0; y <= grid.height; y += 1) {
        layer.graphics.lineBetween(
          0,
          y * grid.tileSize,
          worldWidth,
          y * grid.tileSize,
        );
      }

      layer.rendered = true;
    }
  }
}

function hash01(x: number, y: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;

  return value - Math.floor(value);
}
