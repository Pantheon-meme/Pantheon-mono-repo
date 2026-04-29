import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import type { BiomeDefinition } from "../../biome/BiomeDefinitions";
import {
  createBiomeRegionPlan,
  getDominantRegion,
} from "../../biome/BiomeRegionGeneration";
import type { BiomeSurfaceTile } from "../../biome/BiomeSurfacePlan";
import { PlayerControlled } from "../../player/components/PlayerControlled";
import { Position } from "../../shared/components/Position";
import { TerrainGrid } from "../../terrain/components/TerrainGrid";
import { BiomeMinimap } from "../components/BiomeMinimap";

const terrainColors: Record<string, number> = {
  plain: 0x8bd7bf,
  grass: 0x62c987,
  "forest-floor": 0x3f875d,
  dirt: 0xb77485,
  sand: 0xe7d9a9,
  stone: 0x9c9db8,
  swamp: 0x316f78,
  water: 0x3aa9d9,
  path: 0xf4d88d,
};
const regionColors = [0xff71ce, 0x7bdff2, 0xb2f7aa, 0xf7d794, 0xcdb4db, 0xf29e4c];

export class BiomeMinimapSystem implements System {
  update(world: World): void {
    const grid = world.query(TerrainGrid)[0]?.[1];

    if (!grid) {
      return;
    }

    for (const [, minimap] of world.query(BiomeMinimap)) {
      if (!minimap.rendered) {
        renderStaticMinimap(minimap, grid);
        minimap.rendered = true;
      }

      positionMinimap(minimap);
      renderDynamicOverlay(world, minimap, grid);
    }
  }
}

function renderStaticMinimap(minimap: BiomeMinimap, grid: TerrainGrid): void {
  minimap.terrainLayer.clear();
  minimap.regionLayer.clear();
  minimap.labelLayer.removeAll(true);

  const regionPlan = createBiomeRegionPlan(grid, minimap.biome);
  const regionColorById = createRegionColorMap(minimap.biome);
  const cellWidth = minimap.width / grid.width;
  const cellHeight = minimap.height / grid.height;

  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const tile = getMinimapTile(minimap, grid, x, y, regionPlan);
      const terrainColor = terrainColors[tile.terrainId] ?? 0x7fa67d;

      minimap.terrainLayer.fillStyle(terrainColor, 0.96);
      minimap.terrainLayer.fillRect(
        x * cellWidth,
        y * cellHeight,
        Math.ceil(cellWidth),
        Math.ceil(cellHeight),
      );

      if (tile.regionId) {
        minimap.regionLayer.fillStyle(regionColorById.get(tile.regionId) ?? 0xffffff, 0.1);
        minimap.regionLayer.fillRect(
          x * cellWidth,
          y * cellHeight,
          Math.ceil(cellWidth),
          Math.ceil(cellHeight),
        );
      }
    }
  }

  drawRegionBoundaries(minimap, grid, regionPlan, regionColorById);
  drawRegionLabels(minimap, regionColorById);
}

function drawRegionBoundaries(
  minimap: BiomeMinimap,
  grid: TerrainGrid,
  regionPlan: ReturnType<typeof createBiomeRegionPlan>,
  regionColorById: ReadonlyMap<string, number>,
): void {
  const cellWidth = minimap.width / grid.width;
  const cellHeight = minimap.height / grid.height;

  minimap.regionLayer.lineStyle(1.4, 0xf8fff8, 0.48);

  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const tile = getMinimapTile(minimap, grid, x, y, regionPlan);
      const right = getMinimapTile(minimap, grid, x + 1, y, regionPlan);
      const down = getMinimapTile(minimap, grid, x, y + 1, regionPlan);

      if (tile.regionId && right.regionId && tile.regionId !== right.regionId) {
        minimap.regionLayer.lineBetween(
          (x + 1) * cellWidth,
          y * cellHeight,
          (x + 1) * cellWidth,
          (y + 1) * cellHeight,
        );
      }

      if (tile.regionId && down.regionId && tile.regionId !== down.regionId) {
        minimap.regionLayer.lineBetween(
          x * cellWidth,
          (y + 1) * cellHeight,
          (x + 1) * cellWidth,
          (y + 1) * cellHeight,
        );
      }
    }
  }

  for (const anchor of regionPlan.anchors) {
    const color = regionColorById.get(anchor.definition.id) ?? 0xffffff;

    minimap.regionLayer.fillStyle(color, 0.92);
    minimap.regionLayer.fillCircle(
      anchor.tileX * cellWidth,
      anchor.tileY * cellHeight,
      2.8,
    );
  }
}

function drawRegionLabels(
  minimap: BiomeMinimap,
  regionColorById: ReadonlyMap<string, number>,
): void {
  const labelX = minimap.width + 10;

  minimap.biome.regions.forEach((region, index) => {
    const y = index * 18;
    const swatch = minimap.container.scene.add
      .rectangle(labelX, y + 2, 8, 8, regionColorById.get(region.id) ?? 0xffffff, 0.92)
      .setOrigin(0);
    const label = minimap.container.scene.add
      .text(labelX + 12, y - 2, region.label, {
        color: "#eef7f4",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "11px",
        shadow: {
          color: "#071018",
          blur: 3,
          fill: true,
          offsetX: 1,
          offsetY: 1,
        },
      })
      .setOrigin(0);

    minimap.labelLayer.add([swatch, label]);
  });
}

function renderDynamicOverlay(
  world: World,
  minimap: BiomeMinimap,
  grid: TerrainGrid,
): void {
  const player = world.query(PlayerControlled, Position)[0];

  minimap.overlayLayer.clear();

  if (!player) {
    return;
  }

  const position = player[2];
  const camera = minimap.container.scene.cameras.main;
  const worldWidth = grid.width * grid.tileSize;
  const worldHeight = grid.height * grid.tileSize;
  const playerX = (position.x / worldWidth) * minimap.width;
  const playerY = (position.y / worldHeight) * minimap.height;
  const viewX = (camera.worldView.x / worldWidth) * minimap.width;
  const viewY = (camera.worldView.y / worldHeight) * minimap.height;
  const viewWidth = (camera.worldView.width / worldWidth) * minimap.width;
  const viewHeight = (camera.worldView.height / worldHeight) * minimap.height;

  minimap.overlayLayer.lineStyle(1.5, 0xffffff, 0.72);
  minimap.overlayLayer.strokeRect(viewX, viewY, viewWidth, viewHeight);
  minimap.overlayLayer.fillStyle(0xfff3a1, 1);
  minimap.overlayLayer.fillCircle(playerX, playerY, 3.5);
  minimap.overlayLayer.lineStyle(1.5, 0x071018, 0.9);
  minimap.overlayLayer.strokeCircle(playerX, playerY, 4.2);
}

function positionMinimap(minimap: BiomeMinimap): void {
  const camera = minimap.container.scene.cameras.main;
  const scale = 1 / camera.zoom;
  const worldX = camera.worldView.x + minimap.screenX * scale;
  const worldY = camera.worldView.y + minimap.screenY * scale;

  minimap.container.setPosition(worldX, worldY);
  minimap.container.setScale(scale);
}

function getMinimapTile(
  minimap: BiomeMinimap,
  grid: TerrainGrid,
  x: number,
  y: number,
  regionPlan: ReturnType<typeof createBiomeRegionPlan>,
): Pick<BiomeSurfaceTile, "terrainId" | "regionId"> {
  const surfaceTile = minimap.surfacePlan?.getTile(x, y);

  if (surfaceTile) {
    return surfaceTile;
  }

  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
    return { terrainId: minimap.biome.backgroundTerrainId };
  }

  return {
    terrainId: minimap.biome.backgroundTerrainId,
    regionId: getDominantRegion(regionPlan, x, y)?.definition.id,
  };
}

function createRegionColorMap(biome: BiomeDefinition): Map<string, number> {
  return new Map(
    biome.regions.map((region, index) => [
      region.id,
      regionColors[index % regionColors.length],
    ]),
  );
}
