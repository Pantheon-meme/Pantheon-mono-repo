import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import {
  minimapFrameMapUnderlap,
  minimapFrameSlices,
  minimapFrameVisualInset,
} from "../../../assets/ui/UiFrameAssets";
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

type MinimapMapBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export class BiomeMinimapSystem implements System {
  update(world: World): void {
    const grid = world.query(TerrainGrid)[0]?.[1];

    if (!grid) {
      return;
    }

    for (const [, minimap] of world.query(BiomeMinimap)) {
      applyVisibility(minimap);
      layoutMinimapFrame(minimap);
      positionMinimap(minimap);

      if (!minimap.rendered) {
        renderStaticMinimap(minimap, grid);
        minimap.rendered = true;
      }

      renderDynamicOverlay(world, minimap, grid);
    }
  }
}

function applyVisibility(minimap: BiomeMinimap): void {
  minimap.container.setVisible(minimap.visible);
}

function renderStaticMinimap(minimap: BiomeMinimap, grid: TerrainGrid): void {
  minimap.terrainLayer.clear();
  minimap.regionLayer.clear();

  const regionPlan = createBiomeRegionPlan(grid, minimap.biome);
  const regionColorById = createRegionColorMap(minimap.biome);
  const mapBounds = getMinimapMapBounds(minimap);
  const cellWidth = mapBounds.width / grid.width;
  const cellHeight = mapBounds.height / grid.height;

  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const tile = getMinimapTile(minimap, grid, x, y, regionPlan);
      const terrainColor = terrainColors[tile.terrainId] ?? 0x7fa67d;

      minimap.terrainLayer.fillStyle(terrainColor, 0.96);
      minimap.terrainLayer.fillRect(
        mapBounds.x + x * cellWidth,
        mapBounds.y + y * cellHeight,
        Math.ceil(cellWidth),
        Math.ceil(cellHeight),
      );

      if (tile.regionId) {
        minimap.regionLayer.fillStyle(regionColorById.get(tile.regionId) ?? 0xffffff, 0.1);
        minimap.regionLayer.fillRect(
          mapBounds.x + x * cellWidth,
          mapBounds.y + y * cellHeight,
          Math.ceil(cellWidth),
          Math.ceil(cellHeight),
        );
      }
    }
  }

  drawRegionBoundaries(minimap, grid, regionPlan, regionColorById);
}

function drawRegionBoundaries(
  minimap: BiomeMinimap,
  grid: TerrainGrid,
  regionPlan: ReturnType<typeof createBiomeRegionPlan>,
  regionColorById: ReadonlyMap<string, number>,
): void {
  const mapBounds = getMinimapMapBounds(minimap);
  const cellWidth = mapBounds.width / grid.width;
  const cellHeight = mapBounds.height / grid.height;

  minimap.regionLayer.lineStyle(1.4, 0xf8fff8, 0.48);

  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const tile = getMinimapTile(minimap, grid, x, y, regionPlan);
      const right = getMinimapTile(minimap, grid, x + 1, y, regionPlan);
      const down = getMinimapTile(minimap, grid, x, y + 1, regionPlan);

      if (tile.regionId && right.regionId && tile.regionId !== right.regionId) {
        minimap.regionLayer.lineBetween(
          mapBounds.x + (x + 1) * cellWidth,
          mapBounds.y + y * cellHeight,
          mapBounds.x + (x + 1) * cellWidth,
          mapBounds.y + (y + 1) * cellHeight,
        );
      }

      if (tile.regionId && down.regionId && tile.regionId !== down.regionId) {
        minimap.regionLayer.lineBetween(
          mapBounds.x + x * cellWidth,
          mapBounds.y + (y + 1) * cellHeight,
          mapBounds.x + (x + 1) * cellWidth,
          mapBounds.y + (y + 1) * cellHeight,
        );
      }
    }
  }

  for (const anchor of regionPlan.anchors) {
    const color = regionColorById.get(anchor.definition.id) ?? 0xffffff;

    minimap.regionLayer.fillStyle(color, 0.92);
    minimap.regionLayer.fillCircle(
      mapBounds.x + anchor.tileX * cellWidth,
      mapBounds.y + anchor.tileY * cellHeight,
      2.8,
    );
  }
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
  const mapBounds = getMinimapMapBounds(minimap);
  const playerX = mapBounds.x + (position.x / worldWidth) * mapBounds.width;
  const playerY = mapBounds.y + (position.y / worldHeight) * mapBounds.height;
  const viewX = mapBounds.x + (camera.worldView.x / worldWidth) * mapBounds.width;
  const viewY = mapBounds.y + (camera.worldView.y / worldHeight) * mapBounds.height;
  const viewWidth = (camera.worldView.width / worldWidth) * mapBounds.width;
  const viewHeight = (camera.worldView.height / worldHeight) * mapBounds.height;

  minimap.overlayLayer.lineStyle(1.5, 0xffffff, 0.72);
  minimap.overlayLayer.strokeRect(viewX, viewY, viewWidth, viewHeight);
  minimap.overlayLayer.fillStyle(0xfff3a1, 1);
  minimap.overlayLayer.fillCircle(playerX, playerY, 3.5);
  minimap.overlayLayer.lineStyle(1.5, 0x071018, 0.9);
  minimap.overlayLayer.strokeCircle(playerX, playerY, 4.2);
}

function positionMinimap(minimap: BiomeMinimap): void {
  const camera = minimap.container.scene.cameras.main;
  const cameraScale = 1 / camera.zoom;
  const displayScale = minimap.displayScale * cameraScale;
  const localRight = minimap.background.x + minimap.background.width;
  const localBottom = minimap.background.y + minimap.background.height;
  const worldX =
    camera.worldView.x +
    (camera.width - minimap.screenX) * cameraScale -
    localRight * displayScale;
  const worldY =
    camera.worldView.y +
    (camera.height - minimap.screenY) * cameraScale -
    localBottom * displayScale;

  minimap.container.setPosition(worldX, worldY);
  minimap.container.setScale(displayScale);
}

function layoutMinimapFrame(minimap: BiomeMinimap): void {
  minimap.terrainLayer.setVisible(true);
  minimap.regionLayer.setVisible(true);
  minimap.overlayLayer.setVisible(true);

  const frameWidth =
    minimap.width +
    minimapFrameSlices.left +
    minimapFrameSlices.right;
  const frameHeight =
    minimap.height + minimapFrameSlices.top + minimapFrameSlices.bottom;

  minimap.background.setPosition(
    -minimapFrameSlices.left,
    -minimapFrameSlices.top,
  );
  minimap.background.setSlices(
    frameWidth,
    frameHeight,
    minimapFrameSlices.left,
    minimapFrameSlices.right,
    minimapFrameSlices.top,
    minimapFrameSlices.bottom,
  );
}

function getMinimapMapBounds(
  minimap: BiomeMinimap,
): MinimapMapBounds {
  const x =
    minimapFrameVisualInset.left -
    minimapFrameSlices.left -
    minimapFrameMapUnderlap;
  const y =
    minimapFrameVisualInset.top -
    minimapFrameSlices.top -
    minimapFrameMapUnderlap;
  const width =
    minimap.width +
    minimapFrameSlices.left -
    minimapFrameVisualInset.left +
    minimapFrameSlices.right -
    minimapFrameVisualInset.right +
    minimapFrameMapUnderlap * 2;
  const height =
    minimap.height +
    minimapFrameSlices.top -
    minimapFrameVisualInset.top +
    minimapFrameSlices.bottom -
    minimapFrameVisualInset.bottom +
    minimapFrameMapUnderlap * 2;

  return { x, y, width, height };
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
