import type {
  BiomeDefinition,
  BiomeTerrainDefinition,
} from "./BiomeDefinitions";
import {
  createBiomeRegionPlan,
  getTerrainRegionScore,
} from "./BiomeRegionGeneration";
import {
  createBiomeSurfacePlan,
  type BiomeSurfacePlan,
  usesPlannedBiomeSurface,
} from "./BiomeSurfacePlan";
import type { TerrainGrid } from "../terrain/components/TerrainGrid";

export function seedBiomeTerrainGrid(
  grid: TerrainGrid,
  biome: BiomeDefinition,
  terrain: BiomeTerrainDefinition,
  spawnTileX: number,
  spawnTileY: number,
  surfacePlan?: BiomeSurfacePlan,
): void {
  if (terrain.placement.kind !== "patches") {
    return;
  }

  if (usesPlannedBiomeSurface(biome)) {
    seedPlannedTerrainGrid(
      grid,
      terrain,
      surfacePlan ??
        createBiomeSurfacePlan(grid, biome, spawnTileX, spawnTileY),
    );
    return;
  }

  seedPatchTerrainGrid(grid, biome, terrain, spawnTileX, spawnTileY);
}

function seedPatchTerrainGrid(
  grid: TerrainGrid,
  biome: BiomeDefinition,
  terrain: BiomeTerrainDefinition,
  spawnTileX: number,
  spawnTileY: number,
): void {
  if (terrain.placement.kind !== "patches") {
    return;
  }

  const placement = terrain.placement;
  const regionPlan = createBiomeRegionPlan(grid, biome);

  for (let y = 1; y < grid.height - 1; y += 1) {
    for (let x = 1; x < grid.width - 1; x += 1) {
      if (
        placement.avoidSpawnRadius &&
        isNearSpawn(x, y, spawnTileX, spawnTileY, placement.avoidSpawnRadius)
      ) {
        continue;
      }

      const noise = octaveValueNoise(
        x * placement.frequency,
        y * placement.frequency,
        biome.worldGeneration.seed + placement.seedOffset,
      );
      const regionScore = getTerrainRegionScore(regionPlan, terrain.id, x, y);
      const regionThreshold = Math.max(0.12, placement.threshold - 0.32);
      const texturedScore = regionScore + (noise - 0.5) * 0.3;

      grid.set(
        x,
        y,
        regionScore > 0
          ? texturedScore >= regionThreshold
          : noise >= placement.threshold,
      );
    }
  }
}

function seedPlannedTerrainGrid(
  grid: TerrainGrid,
  terrain: BiomeTerrainDefinition,
  surfacePlan: BiomeSurfacePlan,
): void {
  for (let y = 1; y < grid.height - 1; y += 1) {
    for (let x = 1; x < grid.width - 1; x += 1) {
      grid.set(x, y, surfacePlan.getTile(x, y)?.terrainId === terrain.id);
    }
  }
}

function isNearSpawn(
  x: number,
  y: number,
  spawnTileX: number,
  spawnTileY: number,
  radius: number,
): boolean {
  const dx = x - spawnTileX;
  const dy = y - spawnTileY;

  return dx * dx + dy * dy <= radius * radius;
}

function octaveValueNoise(x: number, y: number, seed: number): number {
  return (
    valueNoise(x, y, seed) * 0.58 +
    valueNoise(x * 2.1 + 13, y * 2.1 - 7, seed + 17) * 0.3 +
    valueNoise(x * 4.2 - 23, y * 4.2 + 19, seed + 43) * 0.12
  );
}

function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const sx = smoothstep(x - x0);
  const sy = smoothstep(y - y0);
  const n00 = hash01(x0, y0, seed);
  const n10 = hash01(x1, y0, seed);
  const n01 = hash01(x0, y1, seed);
  const n11 = hash01(x1, y1, seed);
  const ix0 = lerp(n00, n10, sx);
  const ix1 = lerp(n01, n11, sx);

  return lerp(ix0, ix1, sy);
}

function hash01(x: number, y: number, seed: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;

  return value - Math.floor(value);
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

function lerp(a: number, b: number, amount: number): number {
  return a + (b - a) * amount;
}
