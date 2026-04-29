import type {
  BiomeDefinition,
  BiomeTerrainDefinition,
} from "./BiomeDefinitions";
import {
  createBiomeRegionPlan,
  getTerrainRegionScore,
  tileDistance,
} from "./BiomeRegionGeneration";
import type { TerrainGrid } from "../terrain/components/TerrainGrid";

export function seedBiomeTerrainGrid(
  grid: TerrainGrid,
  biome: BiomeDefinition,
  terrain: BiomeTerrainDefinition,
  spawnTileX: number,
  spawnTileY: number,
): void {
  if (terrain.placement.kind !== "patches") {
    return;
  }

  if (biome.id === "uniswap") {
    seedUniswapTerrainGrid(grid, biome, terrain, spawnTileX, spawnTileY);
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

function seedUniswapTerrainGrid(
  grid: TerrainGrid,
  biome: BiomeDefinition,
  terrain: BiomeTerrainDefinition,
  spawnTileX: number,
  spawnTileY: number,
): void {
  const regionPlan = createBiomeRegionPlan(grid, biome);

  for (let y = 1; y < grid.height - 1; y += 1) {
    for (let x = 1; x < grid.width - 1; x += 1) {
      grid.set(
        x,
        y,
        pickUniswapSurfaceTerrain(
          x,
          y,
          biome,
          regionPlan,
          spawnTileX,
          spawnTileY,
        ) === terrain.id,
      );
    }
  }
}

function pickUniswapSurfaceTerrain(
  x: number,
  y: number,
  biome: BiomeDefinition,
  regionPlan: ReturnType<typeof createBiomeRegionPlan>,
  spawnTileX: number,
  spawnTileY: number,
): string {
  const spawnDistance = tileDistance(x, y, spawnTileX, spawnTileY);

  if (spawnDistance <= biome.worldGeneration.spawnClearingRadius) {
    return "plain";
  }

  const height = octaveValueNoise(
    x * 0.018 + 17,
    y * 0.018 - 11,
    biome.worldGeneration.seed + 211,
  );
  const moisture = octaveValueNoise(
    x * 0.026 - 9,
    y * 0.026 + 31,
    biome.worldGeneration.seed + 307,
  );
  const temperature = octaveValueNoise(
    x * 0.014 + 43,
    y * 0.014 + 7,
    biome.worldGeneration.seed + 401,
  );
  const roughness = getRoughness(x, y, biome.worldGeneration.seed + 211);
  const detail = octaveValueNoise(
    x * 0.09 + 5,
    y * 0.09 - 3,
    biome.worldGeneration.seed + 503,
  );
  const lake = getTerrainRegionScore(regionPlan, "water", x, y);
  const swamp = getTerrainRegionScore(regionPlan, "swamp", x, y);
  const forest = getTerrainRegionScore(regionPlan, "forest-floor", x, y);
  const city = getTerrainRegionScore(regionPlan, "stone", x, y);
  const route = getRouteCorridorScore(regionPlan, x, y);
  const wetness =
    moisture * 0.62 + (1 - height) * 0.24 + lake * 0.34 + swamp * 0.3;
  const waterScore = lake * 0.82 + wetness * 0.5 - route * 0.6 - roughness * 0.28;
  const swampScore = swamp * 0.82 + wetness * 0.34 - route * 0.48 - height * 0.2;
  const shoreScore =
    lake * 0.64 + Math.abs(wetness - 0.68) * -0.42 + detail * 0.18;
  const routeAllowed = waterScore < 0.66 && swampScore < 0.72;

  if (waterScore > 0.72) {
    return "water";
  }

  if (swampScore > 0.76) {
    return "swamp";
  }

  if (routeAllowed && route > 0.58) {
    return "path";
  }

  if (shoreScore > 0.48 && lake > 0.08) {
    return "sand";
  }

  if (city > 0.22 && height + roughness * 0.7 > 0.68) {
    return "stone";
  }

  if (
    forest > 0.32 &&
    moisture + (1 - temperature) * 0.22 + detail * 0.2 > 0.72
  ) {
    return "forest-floor";
  }

  if (city > 0.12 && detail > 0.63 && moisture < 0.7) {
    return "dirt";
  }

  if (forest > 0.12 || moisture > 0.48) {
    return "grass";
  }

  return "plain";
}

function getRouteCorridorScore(
  regionPlan: ReturnType<typeof createBiomeRegionPlan>,
  x: number,
  y: number,
): number {
  let score = 0;

  for (const connection of regionPlan.connections) {
    const distance = distanceToSegment(
      x,
      y,
      connection.from.tileX,
      connection.from.tileY,
      connection.to.tileX,
      connection.to.tileY,
    );

    if (distance > 2.8) {
      continue;
    }

    score = Math.max(score, 1 - distance / 2.8);
  }

  return score;
}

function getRoughness(x: number, y: number, seed: number): number {
  const center = octaveValueNoise(x * 0.018 + 17, y * 0.018 - 11, seed);
  const east = octaveValueNoise((x + 1) * 0.018 + 17, y * 0.018 - 11, seed);
  const south = octaveValueNoise(x * 0.018 + 17, (y + 1) * 0.018 - 11, seed);

  return Math.min(1, (Math.abs(center - east) + Math.abs(center - south)) * 12);
}

function distanceToSegment(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return tileDistance(x, y, x1, y1);
  }

  const amount = Math.max(
    0,
    Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared),
  );
  const projectedX = x1 + amount * dx;
  const projectedY = y1 + amount * dy;

  return tileDistance(x, y, projectedX, projectedY);
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
