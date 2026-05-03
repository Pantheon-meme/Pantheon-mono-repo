import type { TerrainGrid } from "../terrain/components/TerrainGrid";
import type { BiomeDefinition } from "./BiomeDefinitions";
import {
  createBiomeRegionPlan,
  getDominantRegion,
  getRegionInfluence,
  tileDistance,
} from "./BiomeRegionGeneration";

export type BiomeSurfaceTile = {
  x: number;
  y: number;
  terrainId: string;
  regionId?: string;
  height: number;
  moisture: number;
  temperature: number;
  roughness: number;
  detail: number;
  wetness: number;
  route: number;
  shore: number;
  canopy: number;
  fertility: number;
};

export type BiomeSurfacePlan = {
  biomeId: string;
  width: number;
  height: number;
  tileSize: number;
  getTile: (x: number, y: number) => BiomeSurfaceTile | undefined;
};

const terrainSemanticIds = [
  "plain",
  "grass",
  "forest-floor",
  "dirt",
  "sand",
  "stone",
  "swamp",
  "water",
  "path",
] as const;

type TerrainSemanticId = (typeof terrainSemanticIds)[number];

export function createBiomeSurfacePlan(
  grid: TerrainGrid,
  biome: BiomeDefinition,
  spawnTileX: number,
  spawnTileY: number,
): BiomeSurfacePlan {
  if (!usesPlannedBiomeSurface(biome)) {
    return createFallbackSurfacePlan(grid, biome);
  }

  return createProtocolSurfacePlan(grid, biome, spawnTileX, spawnTileY);
}

export function usesPlannedBiomeSurface(biome: BiomeDefinition): boolean {
  return biome.regions.length > 1;
}

export function surfaceMatchesTerrainIds(
  surfacePlan: BiomeSurfacePlan | undefined,
  tileX: number,
  tileY: number,
  terrainIds: readonly string[] | undefined,
): boolean | undefined {
  if (!surfacePlan || !terrainIds) {
    return undefined;
  }

  const tile = surfacePlan.getTile(tileX, tileY);

  return tile
    ? terrainIds.some((terrainId) => terrainMatches(tile.terrainId, terrainId))
    : false;
}

export function isTreeAllowedOnSurface(
  surfacePlan: BiomeSurfacePlan | undefined,
  tileX: number,
  tileY: number,
): boolean {
  if (!surfacePlan) {
    return true;
  }

  const tile = surfacePlan.getTile(tileX, tileY);

  if (!tile) {
    return false;
  }

  const terrainSemantic = getTerrainSemanticId(tile.terrainId);

  if (tile.route > 0.5 || terrainSemantic === "path") {
    return false;
  }

  return (
    terrainSemantic === "forest-floor" ||
    terrainSemantic === "grass" ||
    (terrainSemantic === "sand" && tile.moisture > 0.46) ||
    (terrainSemantic === "swamp" && tile.canopy > 0.34)
  );
}

export function getSurfaceTreePlacementChance(
  surfacePlan: BiomeSurfacePlan | undefined,
  tileX: number,
  tileY: number,
): number | undefined {
  if (!surfacePlan) {
    return undefined;
  }

  const tile = surfacePlan.getTile(tileX, tileY);

  if (!tile) {
    return 0;
  }

  const terrainSemantic = getTerrainSemanticId(tile.terrainId);

  if (tile.route > 0.5 || terrainSemantic === "path") {
    return 0;
  }

  switch (terrainSemantic) {
    case "forest-floor":
      return 0.08 + tile.canopy * 0.28;
    case "swamp":
      return 0.12 + tile.canopy * 0.34 + tile.wetness * 0.06;
    case "sand":
      return tile.shore > 0.18 ? 0.04 + tile.moisture * 0.12 : 0.02;
    case "grass":
      return 0.025 + tile.fertility * 0.08;
    default:
      return 0;
  }
}

export function isObjectAllowedOnSurface(
  surfacePlan: BiomeSurfacePlan | undefined,
  tileX: number,
  tileY: number,
  terrainIds: readonly string[] | undefined,
): boolean {
  if (!surfacePlan) {
    return true;
  }

  const tile = surfacePlan.getTile(tileX, tileY);

  if (!tile) {
    return false;
  }

  if (
    terrainIds &&
    !terrainIds.some((terrainId) => terrainMatches(tile.terrainId, terrainId))
  ) {
    return false;
  }

  return (
    getTerrainSemanticId(tile.terrainId) !== "water" ||
    Boolean(
      terrainIds?.some((terrainId) => getTerrainSemanticId(terrainId) === "water"),
    )
  );
}

export function getSurfacePlacementScore(
  surfacePlan: BiomeSurfacePlan | undefined,
  tileX: number,
  tileY: number,
  placementKind:
    | "fixed-tile"
    | "region-center"
    | "spawn-ring"
    | "path-edge"
    | "pool-edge"
    | "grove-edge"
    | "scattered",
): number {
  const tile = surfacePlan?.getTile(tileX, tileY);

  if (!surfacePlan || !tile) {
    return 1;
  }

  const terrainSemantic = getTerrainSemanticId(tile.terrainId);

  switch (placementKind) {
    case "fixed-tile":
    case "region-center":
      return 1;
    case "path-edge":
      return tile.route > 0.25 && terrainSemantic !== "water" ? tile.route : 0;
    case "pool-edge":
      return tile.shore > 0.24 || terrainSemantic === "swamp"
        ? Math.max(tile.shore, tile.wetness)
        : 0;
    case "grove-edge":
      return tile.canopy > 0.28 && terrainSemantic !== "water" ? tile.canopy : 0;
    case "scattered":
      return terrainSemantic === "water" ? 0 : Math.max(0.18, tile.fertility);
    case "spawn-ring":
      return 1;
  }
}

function createFallbackSurfacePlan(
  grid: TerrainGrid,
  biome: BiomeDefinition,
): BiomeSurfacePlan {
  const fallbackTile = (x: number, y: number): BiomeSurfaceTile => ({
    x,
    y,
    terrainId: biome.backgroundTerrainId,
    height: 0.5,
    moisture: 0.5,
    temperature: 0.5,
    roughness: 0,
    detail: 0.5,
    wetness: 0.5,
    route: 0,
    shore: 0,
    canopy: 0,
    fertility: 0.5,
  });

  return {
    biomeId: biome.id,
    width: grid.width,
    height: grid.height,
    tileSize: grid.tileSize,
    getTile: (x, y) =>
      x >= 0 && y >= 0 && x < grid.width && y < grid.height
        ? fallbackTile(x, y)
        : undefined,
  };
}

function createProtocolSurfacePlan(
  grid: TerrainGrid,
  biome: BiomeDefinition,
  spawnTileX: number,
  spawnTileY: number,
): BiomeSurfacePlan {
  const regionPlan = createBiomeRegionPlan(grid, biome);
  const tiles = new Map<string, BiomeSurfaceTile>();

  for (let y = 1; y < grid.height - 1; y += 1) {
    for (let x = 1; x < grid.width - 1; x += 1) {
      const tile = createProtocolSurfaceTile(
        x,
        y,
        biome,
        regionPlan,
        spawnTileX,
        spawnTileY,
      );

      tiles.set(cellKey(x, y), tile);
    }
  }

  return {
    biomeId: biome.id,
    width: grid.width,
    height: grid.height,
    tileSize: grid.tileSize,
    getTile: (x, y) => tiles.get(cellKey(x, y)),
  };
}

function createProtocolSurfaceTile(
  x: number,
  y: number,
  biome: BiomeDefinition,
  regionPlan: ReturnType<typeof createBiomeRegionPlan>,
  spawnTileX: number,
  spawnTileY: number,
): BiomeSurfaceTile {
  const spawnDistance = tileDistance(x, y, spawnTileX, spawnTileY);
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
  const lake = getSemanticTerrainRegionScore(regionPlan, "water", x, y);
  const swamp = getSemanticTerrainRegionScore(regionPlan, "swamp", x, y);
  const forest = getSemanticTerrainRegionScore(regionPlan, "forest-floor", x, y);
  const city = getSemanticTerrainRegionScore(regionPlan, "stone", x, y);
  const route = getRouteCorridorScore(regionPlan, x, y);
  const oraclePattern = octaveValueNoise(
    x * 0.052 - 31,
    y * 0.052 + 19,
    biome.worldGeneration.seed + 911,
  );
  const islandPattern = octaveValueNoise(
    x * 0.085 + 29,
    y * 0.085 - 37,
    biome.worldGeneration.seed + 1217,
  );
  const wetness =
    moisture * 0.62 + (1 - height) * 0.24 + lake * 0.34 + swamp * 0.3;
  const waterScore =
    lake * 0.82 +
    wetness * 0.5 +
    swamp * Math.max(0, oraclePattern - 0.54) * 0.58 -
    route * 0.6 -
    roughness * 0.28;
  const swampScore =
    swamp * 0.94 +
    wetness * 0.34 +
    oraclePattern * swamp * 0.18 -
    route * 0.48 -
    height * 0.2;
  const shore =
    lake * 0.64 +
    swamp * 0.36 +
    Math.abs(wetness - 0.68) * -0.42 +
    detail * 0.18;
  const canopy = Math.max(
    0,
    forest * 0.74 + swamp * 0.42 + moisture * 0.25 - route * 0.36,
  );
  const fertility = Math.max(
    0,
    Math.min(1, moisture * 0.42 + canopy * 0.42 + (1 - roughness) * 0.16),
  );
  let terrainSemanticId: TerrainSemanticId = "plain";

  if (spawnDistance <= biome.worldGeneration.spawnClearingRadius) {
    terrainSemanticId = "plain";
  } else if (
    swamp > 0.2 &&
    islandPattern > 0.72 &&
    waterScore < 0.86 &&
    route < 0.42
  ) {
    terrainSemanticId = height + roughness > 0.96 ? "stone" : "forest-floor";
  } else if (
    swamp > 0.22 &&
    islandPattern > 0.62 &&
    wetness < 0.82 &&
    route < 0.42
  ) {
    terrainSemanticId = "sand";
  } else if (
    city > 0.34 &&
    height + roughness * 0.8 > 0.48 &&
    waterScore < 0.72
  ) {
    terrainSemanticId = "stone";
  } else if (waterScore > 0.72) {
    terrainSemanticId = "water";
  } else if (swampScore > 0.7) {
    terrainSemanticId = "swamp";
  } else if (waterScore < 0.66 && swampScore < 0.72 && route > 0.58) {
    terrainSemanticId = "path";
  } else if (shore > 0.48 && lake > 0.08) {
    terrainSemanticId = "sand";
  } else if (city > 0.22 && height + roughness * 0.7 > 0.68) {
    terrainSemanticId = "stone";
  } else if (
    forest > 0.32 &&
    moisture + (1 - temperature) * 0.22 + detail * 0.2 > 0.72
  ) {
    terrainSemanticId = "forest-floor";
  } else if (city > 0.12 && detail > 0.63 && moisture < 0.7) {
    terrainSemanticId = "dirt";
  } else if (forest > 0.12 || moisture > 0.48) {
    terrainSemanticId = "grass";
  }

  const terrainId = resolveSurfaceTerrainId(
    biome,
    regionPlan,
    terrainSemanticId,
    x,
    y,
  );

  return {
    x,
    y,
    terrainId,
    regionId: getDominantRegion(regionPlan, x, y)?.definition.id,
    height,
    moisture,
    temperature,
    roughness,
    detail,
    wetness,
    route,
    shore,
    canopy,
    fertility,
  };
}

function getSemanticTerrainRegionScore(
  regionPlan: ReturnType<typeof createBiomeRegionPlan>,
  terrainSemanticId: TerrainSemanticId,
  x: number,
  y: number,
): number {
  let score = 0;

  for (const anchor of regionPlan.anchors) {
    for (const terrain of anchor.definition.terrains) {
      if (getTerrainSemanticId(terrain.terrainId) !== terrainSemanticId) {
        continue;
      }

      score = Math.max(
        score,
        terrain.weight * getRegionInfluence(anchor, x, y),
      );
    }
  }

  return Math.max(
    score,
    getSemanticConnectionTerrainScore(regionPlan, terrainSemanticId, x, y),
  );
}

function getSemanticConnectionTerrainScore(
  regionPlan: ReturnType<typeof createBiomeRegionPlan>,
  terrainSemanticId: TerrainSemanticId,
  x: number,
  y: number,
): number {
  if (terrainSemanticId !== "path" && terrainSemanticId !== "stone") {
    return 0;
  }

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

    if (distance > 2.2) {
      continue;
    }

    const routeScore = terrainSemanticId === "path" ? 0.9 : 0.22;

    score = Math.max(score, routeScore * (1 - distance / 2.2));
  }

  return score;
}

function resolveSurfaceTerrainId(
  biome: BiomeDefinition,
  regionPlan: ReturnType<typeof createBiomeRegionPlan>,
  terrainSemanticId: TerrainSemanticId,
  x: number,
  y: number,
): string {
  const dominantRegion = getDominantRegion(regionPlan, x, y);
  const regionTerrainId = dominantRegion?.definition.terrains.find(
    (terrain) => getTerrainSemanticId(terrain.terrainId) === terrainSemanticId,
  )?.terrainId;

  if (regionTerrainId) {
    return regionTerrainId;
  }

  return (
    biome.terrains.find(
      (terrain) => getTerrainSemanticId(terrain.id) === terrainSemanticId,
    )?.id ?? biome.backgroundTerrainId
  );
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

function terrainMatches(
  actualTerrainId: string,
  expectedTerrainId: string,
): boolean {
  return (
    actualTerrainId === expectedTerrainId ||
    getTerrainSemanticId(actualTerrainId) ===
      getTerrainSemanticId(expectedTerrainId)
  );
}

function getTerrainSemanticId(terrainId: string): TerrainSemanticId | string {
  return (
    terrainSemanticIds.find(
      (semanticId) =>
        terrainId === semanticId || terrainId.endsWith(`-${semanticId}`),
    ) ?? terrainId
  );
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}
