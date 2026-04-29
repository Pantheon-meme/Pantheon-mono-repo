import type { Entity, World } from "../../ecs/World";
import {
  objectSpriteAssets,
  type ObjectSpriteAsset,
} from "../../assets/object-sprites/ObjectSpriteAssets";
import type { TerrainGrid } from "../terrain/components/TerrainGrid";
import { Footprint } from "../shared/components/Footprint";
import { Position } from "../shared/components/Position";
import { WeightInspectable } from "../shared/components/WeightInspectable";
import { WeightedObject } from "../shared/components/WeightedObject";
import { BiomeObject } from "./components/BiomeObject";
import type { BiomeDefinition, BiomeObjectDefinition } from "./BiomeDefinitions";
import {
  getSurfacePlacementScore,
  isObjectAllowedOnSurface,
  surfaceMatchesTerrainIds,
  type BiomeSurfacePlan,
} from "./BiomeSurfacePlan";
import {
  createBiomeRegionPlan,
  getDominantRegion,
  getObjectRegionScore,
  isNearRegionConnection,
  tileDistance,
} from "./BiomeRegionGeneration";

type SeedBiomeObjectsOptions = {
  spawnTileX: number;
  spawnTileY: number;
  terrainGrids?: ReadonlyMap<string, TerrainGrid>;
  surfacePlan?: BiomeSurfacePlan;
};

const maxPlacementAttempts = 500;
const objectSpriteRegistry: Record<string, ObjectSpriteAsset> = objectSpriteAssets;

export function seedBiomeObjects(
  world: World,
  grid: TerrainGrid,
  biome: BiomeDefinition,
  options: SeedBiomeObjectsOptions,
): void {
  const occupied = new Set<string>();
  const regionPlan = createBiomeRegionPlan(grid, biome);

  for (const definition of biome.objects) {
    if (!objectSpriteRegistry[definition.visual.spriteSheetId]) {
      continue;
    }

    const random = createMulberry32(
      biome.worldGeneration.seed + definition.placement.seedOffset,
    );
    const placements = pickObjectPlacements(
      grid,
      definition,
      options,
      random,
      regionPlan,
    );

    for (const placement of placements) {
      if (isFootprintOccupied(definition, placement.tileX, placement.tileY, occupied)) {
        continue;
      }

      createBiomeObjectEntity(world, grid, definition, placement.tileX, placement.tileY);
      occupyFootprint(definition, placement.tileX, placement.tileY, occupied);
    }
  }
}

function createBiomeObjectEntity(
  world: World,
  grid: TerrainGrid,
  definition: BiomeObjectDefinition,
  tileX: number,
  tileY: number,
): Entity {
  const entity = world.createEntity();
  const footprintWidth = definition.footprintTiles.width * grid.tileSize;
  const footprintHeight = definition.footprintTiles.height * grid.tileSize;

  world.addComponent(
    entity,
    Position,
    new Position(
      tileX * grid.tileSize + grid.tileSize / 2,
      tileY * grid.tileSize + grid.tileSize / 2,
    ),
  );
  world.addComponent(entity, Footprint, new Footprint(footprintWidth, footprintHeight));
  world.addComponent(entity, WeightedObject, new WeightedObject(999));
  world.addComponent(entity, WeightInspectable, new WeightInspectable(definition.label));
  world.addComponent(
    entity,
    BiomeObject,
    new BiomeObject(
      definition.id,
      definition.visual.spriteSheetId,
      definition.visual.row,
      definition.visual.column,
      definition.visual.scale,
      definition.visual.groundOriginY,
    ),
  );

  return entity;
}

function pickObjectPlacements(
  grid: TerrainGrid,
  definition: BiomeObjectDefinition,
  options: SeedBiomeObjectsOptions,
  random: () => number,
  regionPlan: ReturnType<typeof createBiomeRegionPlan>,
): Array<{ tileX: number; tileY: number }> {
  if (definition.placement.kind === "spawn-ring") {
    return pickSpawnRingPlacements(grid, definition, options, random);
  }

  const placements: Array<{ tileX: number; tileY: number }> = [];

  for (
    let attempt = 0;
    placements.length < definition.placement.count && attempt < maxPlacementAttempts;
    attempt += 1
  ) {
    const tileX = 2 + Math.floor(random() * Math.max(1, grid.width - 4));
    const tileY = 2 + Math.floor(random() * Math.max(1, grid.height - 4));
    const distance = tileDistance(tileX, tileY, options.spawnTileX, options.spawnTileY);

    if (!isWithinPlacementRange(definition, distance)) {
      continue;
    }

    const region = getDominantRegion(regionPlan, tileX, tileY);
    const regionObject = region?.definition.objects.find(
      (object) => object.objectId === definition.id,
    );

    if (!region || !regionObject) {
      continue;
    }

    if (
      !matchesObjectFootprintTerrain(
        definition,
        regionObject.terrainIds ?? definition.placement.terrainIds,
        tileX,
        tileY,
        options.terrainGrids,
        options.surfacePlan,
      )
    ) {
      continue;
    }

    if (
      !matchesPlacementMotif(
        definition,
        tileX,
        tileY,
        random,
        regionPlan,
        region.definition.id,
        options.surfacePlan,
      )
    ) {
      continue;
    }

    placements.push({ tileX, tileY });
  }

  return placements;
}

function matchesObjectFootprintTerrain(
  definition: BiomeObjectDefinition,
  terrainIds: string[] | undefined,
  tileX: number,
  tileY: number,
  terrainGrids?: ReadonlyMap<string, TerrainGrid>,
  surfacePlan?: BiomeSurfacePlan,
): boolean {
  for (let y = 0; y < definition.footprintTiles.height; y += 1) {
    for (let x = 0; x < definition.footprintTiles.width; x += 1) {
      if (
        !matchesRegionObjectTerrain(
          terrainIds,
          tileX + x,
          tileY + y,
          terrainGrids,
          surfacePlan,
        )
      ) {
        return false;
      }
    }
  }

  return true;
}

function pickSpawnRingPlacements(
  grid: TerrainGrid,
  definition: BiomeObjectDefinition,
  options: SeedBiomeObjectsOptions,
  random: () => number,
): Array<{ tileX: number; tileY: number }> {
  if (
    definition.placement.count === 1 &&
    (definition.placement.maxSpawnDistance ?? 0) === 0
  ) {
    return [{ tileX: options.spawnTileX, tileY: options.spawnTileY + 2 }];
  }

  return Array.from({ length: definition.placement.count }, (_, index) => {
    const minDistance = definition.placement.minSpawnDistance ?? 5;
    const maxDistance = definition.placement.maxSpawnDistance ?? minDistance + 8;
    const angle =
      (Math.PI * 2 * index) / definition.placement.count +
      random() * 0.45;
    const distance = minDistance + random() * Math.max(1, maxDistance - minDistance);
    const tileX = clampTile(
      Math.round(options.spawnTileX + Math.cos(angle) * distance),
      grid.width,
    );
    const tileY = clampTile(
      Math.round(options.spawnTileY + Math.sin(angle) * distance),
      grid.height,
    );

    return { tileX, tileY };
  });
}

function matchesPlacementMotif(
  definition: BiomeObjectDefinition,
  tileX: number,
  tileY: number,
  random: () => number,
  regionPlan: ReturnType<typeof createBiomeRegionPlan>,
  regionId: string,
  surfacePlan?: BiomeSurfacePlan,
): boolean {
  const regionScore = getObjectRegionScore(
    regionPlan,
    definition.id,
    tileX,
    tileY,
    [regionId],
  );

  if (regionScore <= 0) {
    return false;
  }

  const surfaceScore = getSurfacePlacementScore(
    surfacePlan,
    tileX,
    tileY,
    definition.placement.kind,
  );

  if (surfaceScore <= 0) {
    return false;
  }

  switch (definition.placement.kind) {
    case "path-edge":
      return (
        isNearRegionConnection(regionPlan, tileX, tileY, 3.2) &&
        random() < Math.max(0.18, regionScore * surfaceScore * 1.8)
      );
    case "pool-edge":
      return (
        octaveValueNoise(tileX * 0.08, tileY * 0.08, 911) > 0.56 &&
        random() < Math.max(0.12, regionScore * surfaceScore * 1.6)
      );
    case "grove-edge":
      return (
        octaveValueNoise(tileX * 0.06 + 9, tileY * 0.06 - 4, 1201) > 0.48 &&
        random() < Math.max(0.14, regionScore * surfaceScore * 1.7)
      );
    case "scattered":
      return random() < Math.max(0.12, regionScore * surfaceScore * 1.45);
    case "spawn-ring":
      return true;
  }
}

function matchesRegionObjectTerrain(
  terrainIds: string[] | undefined,
  tileX: number,
  tileY: number,
  terrainGrids?: ReadonlyMap<string, TerrainGrid>,
  surfacePlan?: BiomeSurfacePlan,
): boolean {
  const surfaceMatch = surfaceMatchesTerrainIds(
    surfacePlan,
    tileX,
    tileY,
    terrainIds,
  );

  if (surfaceMatch !== undefined) {
    return (
      surfaceMatch &&
      isObjectAllowedOnSurface(surfacePlan, tileX, tileY, terrainIds)
    );
  }

  if (!terrainIds || !terrainGrids) {
    return true;
  }

  return terrainIds.some(
    (terrainId) => terrainGrids.get(terrainId)?.has(tileX, tileY) ?? false,
  );
}

function isWithinPlacementRange(
  definition: BiomeObjectDefinition,
  distance: number,
): boolean {
  const minDistance = definition.placement.minSpawnDistance ?? 0;
  const maxDistance = definition.placement.maxSpawnDistance ?? Number.POSITIVE_INFINITY;

  return distance >= minDistance && distance <= maxDistance;
}

function isFootprintOccupied(
  definition: BiomeObjectDefinition,
  tileX: number,
  tileY: number,
  occupied: ReadonlySet<string>,
): boolean {
  return footprintKeys(definition, tileX, tileY).some((key) =>
    occupied.has(key),
  );
}

function occupyFootprint(
  definition: BiomeObjectDefinition,
  tileX: number,
  tileY: number,
  occupied: Set<string>,
): void {
  for (const key of footprintKeys(definition, tileX, tileY)) {
    occupied.add(key);
  }
}

function footprintKeys(
  definition: BiomeObjectDefinition,
  tileX: number,
  tileY: number,
): string[] {
  const keys: string[] = [];

  for (let y = 0; y < definition.footprintTiles.height; y += 1) {
    for (let x = 0; x < definition.footprintTiles.width; x += 1) {
      keys.push(cellKey(tileX + x, tileY + y));
    }
  }

  return keys;
}

function clampTile(value: number, max: number): number {
  return Math.max(1, Math.min(max - 2, value));
}

function cellKey(tileX: number, tileY: number): string {
  return `${tileX},${tileY}`;
}

function createMulberry32(seed: number): () => number {
  let value = seed;

  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);

    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function octaveValueNoise(x: number, y: number, seed: number): number {
  return (
    valueNoise(x, y, seed) * 0.62 +
    valueNoise(x * 2.1 + 11, y * 2.1 - 5, seed + 19) * 0.28 +
    valueNoise(x * 4.2 - 17, y * 4.2 + 13, seed + 41) * 0.1
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
