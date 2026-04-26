import type { World } from "../../ecs/World";
import { TerrainGrid } from "../components/TerrainGrid";
import { TerrainLayer } from "../components/TerrainLayer";

export type TerrainLayerEntry = {
  grid: TerrainGrid;
  layer: TerrainLayer;
};

export function getTerrainLayer(
  world: World,
  id: string,
): TerrainLayerEntry | undefined {
  return getTerrainLayers(world).find((entry) => entry.layer.id === id);
}

export function getTopTerrainLayerAtCell(
  world: World,
  x: number,
  y: number,
): TerrainLayerEntry | undefined {
  return getTerrainLayers(world)
    .reverse()
    .find((entry) => entry.grid.has(x, y));
}

function getTerrainLayers(world: World): TerrainLayerEntry[] {
  return world
    .query(TerrainGrid, TerrainLayer)
    .map(([, grid, layer]) => ({ grid, layer }))
    .sort((a, b) => a.layer.stackOrder - b.layer.stackOrder);
}
