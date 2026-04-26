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
  const terrainLayers = world
    .query(TerrainGrid, TerrainLayer)
    .map(([, grid, layer]) => ({ grid, layer }))
    .sort((a, b) => a.layer.stackOrder - b.layer.stackOrder);

  return terrainLayers.find((entry) => entry.layer.id === id);
}
