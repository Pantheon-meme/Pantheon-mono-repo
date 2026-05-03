import type { BiomeDefinition } from "../biome/BiomeDefinitions";
import { seedBiomeTerrainGrid } from "../biome/BiomeTerrainGeneration";
import {
  createBiomeSurfacePlan,
  type BiomeSurfacePlan,
  usesPlannedBiomeSurface,
} from "../biome/BiomeSurfacePlan";
import { TerrainGrid } from "./components/TerrainGrid";

export type TerrainSeedRecord = {
  x: number;
  y: number;
  terrainId: string;
  biomeId: string;
};

export type GenerateTerrainSeedRecordsOptions = {
  biome: BiomeDefinition;
  gridWidth: number;
  gridHeight: number;
  tileSize: number;
  spawnTileX: number;
  spawnTileY: number;
};

export function generateTerrainSeedRecords(
  options: GenerateTerrainSeedRecordsOptions,
): TerrainSeedRecord[] {
  const surfacePlan = createSurfacePlan(options);
  const terrainGrids = createTerrainGrids(options, surfacePlan);
  const visibleTerrains = options.biome.terrains
    .filter((terrain) => terrain.placement.kind !== "background")
    .sort((a, b) => a.stackOrder - b.stackOrder);
  const records: TerrainSeedRecord[] = [];

  for (let y = 0; y < options.gridHeight; y += 1) {
    for (let x = 0; x < options.gridWidth; x += 1) {
      let terrainId = options.biome.backgroundTerrainId;

      for (const terrain of visibleTerrains) {
        if (terrainGrids.get(terrain.id)?.has(x, y)) {
          terrainId = terrain.id;
        }
      }

      records.push({
        x,
        y,
        terrainId,
        biomeId: options.biome.id,
      });
    }
  }

  return records;
}

function createSurfacePlan(
  options: GenerateTerrainSeedRecordsOptions,
): BiomeSurfacePlan | undefined {
  if (!usesPlannedBiomeSurface(options.biome)) {
    return undefined;
  }

  return createBiomeSurfacePlan(
    new TerrainGrid(options.gridWidth, options.gridHeight, options.tileSize),
    options.biome,
    options.spawnTileX,
    options.spawnTileY,
  );
}

function createTerrainGrids(
  options: GenerateTerrainSeedRecordsOptions,
  surfacePlan: BiomeSurfacePlan | undefined,
): Map<string, TerrainGrid> {
  const grids = new Map<string, TerrainGrid>();

  for (const terrain of options.biome.terrains) {
    if (terrain.placement.kind === "background") {
      continue;
    }

    const grid = new TerrainGrid(
      options.gridWidth,
      options.gridHeight,
      options.tileSize,
    );

    seedBiomeTerrainGrid(
      grid,
      options.biome,
      terrain,
      options.spawnTileX,
      options.spawnTileY,
      surfacePlan,
    );
    grids.set(terrain.id, grid);
  }

  return grids;
}
