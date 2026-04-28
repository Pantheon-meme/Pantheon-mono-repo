import type { World } from "../../ecs/World";
import { createPlantEntity } from "../actions/ActionHelpers";
import type { TerrainGrid } from "../terrain/components/TerrainGrid";
import { PlantState, type PlantStage } from "./components/PlantState";
import {
  plantDefinitions,
  type PlantDefinition,
} from "./PlantDefinitions";

type TreeGrove = {
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  density: number;
  species: PlantDefinition[];
};

type WorldTreeGenerationOptions = {
  seed: number;
  spawnTileX: number;
  spawnTileY: number;
  spawnClearingRadius?: number;
};

const groveCount = 18;
const spawnClearingRadiusDefault = 8;
const minimumTreeDistance = 2;
const groveEdgeSoftness = 0.42;
const sparseWildChance = 0.006;

export function seedWorldTrees(
  world: World,
  grassGrid: TerrainGrid,
  dirtGrid: TerrainGrid,
  options: WorldTreeGenerationOptions,
): void {
  const treeDefinitions = Object.values(plantDefinitions).filter(
    (definition) => definition.kind === "tree",
  );

  if (treeDefinitions.length === 0) {
    return;
  }

  const random = createMulberry32(options.seed);
  const groves = createGroves(grassGrid, treeDefinitions, random);
  const occupied = new Set<string>();
  const spawnClearingRadius =
    options.spawnClearingRadius ?? spawnClearingRadiusDefault;

  for (let y = 1; y < grassGrid.height - 1; y += 1) {
    for (let x = 1; x < grassGrid.width - 1; x += 1) {
      if (
        dirtGrid.has(x, y) ||
        isNearSpawn(
          x,
          y,
          options.spawnTileX,
          options.spawnTileY,
          spawnClearingRadius,
        ) ||
        isTooCloseToTree(x, y, occupied)
      ) {
        continue;
      }

      const grove = pickDominantGrove(x, y, groves);
      const noise = octaveValueNoise(x, y, options.seed);
      const wildChance = noise > 0.76 ? sparseWildChance : 0;
      const placeChance = grove
        ? grove.density * groveFalloff(x, y, grove) * (0.48 + noise * 0.92)
        : wildChance;

      if (random() > placeChance) {
        continue;
      }

      const species = grove
        ? pickGroveSpecies(grove, x, y, options.seed, random)
        : pickRandom(treeDefinitions, random);
      const plantEntity = createPlantEntity(
        world,
        grassGrid.tileSize,
        x,
        y,
        species,
      );
      const plant = world.getComponent(plantEntity, PlantState);

      if (plant) {
        const stage = pickTreeStage(grove, x, y, options.seed, random);

        plant.stage = stage;
        plant.elapsedSeconds = elapsedForStage(species, stage, random);
      }

      occupied.add(cellKey(x, y));
    }
  }
}

function createGroves(
  grid: TerrainGrid,
  treeDefinitions: PlantDefinition[],
  random: () => number,
): TreeGrove[] {
  return Array.from({ length: groveCount }, () => {
    const speciesCount = random() < 0.72 ? 2 : 3;

    return {
      centerX: 8 + random() * (grid.width - 16),
      centerY: 8 + random() * (grid.height - 16),
      radiusX: 10 + random() * 22,
      radiusY: 8 + random() * 20,
      density: 0.16 + random() * 0.2,
      species: shuffle([...treeDefinitions], random).slice(0, speciesCount),
    };
  });
}

function pickDominantGrove(
  x: number,
  y: number,
  groves: TreeGrove[],
): TreeGrove | undefined {
  let bestGrove: TreeGrove | undefined;
  let bestFalloff = 0;

  for (const grove of groves) {
    const falloff = groveFalloff(x, y, grove);

    if (falloff > bestFalloff) {
      bestGrove = grove;
      bestFalloff = falloff;
    }
  }

  return bestFalloff > 0 ? bestGrove : undefined;
}

function groveFalloff(x: number, y: number, grove: TreeGrove): number {
  const normalizedX = (x - grove.centerX) / grove.radiusX;
  const normalizedY = (y - grove.centerY) / grove.radiusY;
  const distance = Math.sqrt(
    normalizedX * normalizedX + normalizedY * normalizedY,
  );

  if (distance >= 1) {
    return 0;
  }

  const edge = 1 - distance;

  return Math.min(1, edge / groveEdgeSoftness);
}

function pickGroveSpecies(
  grove: TreeGrove,
  x: number,
  y: number,
  seed: number,
  random: () => number,
): PlantDefinition {
  const noise = octaveValueNoise(x * 0.65 + 19, y * 0.65 - 7, seed + 91);
  const index =
    noise > 0.68 && grove.species.length > 1
      ? 1 + Math.floor(random() * (grove.species.length - 1))
      : 0;

  return grove.species[index] ?? grove.species[0];
}

function pickTreeStage(
  grove: TreeGrove | undefined,
  x: number,
  y: number,
  seed: number,
  random: () => number,
): PlantStage {
  const noise = octaveValueNoise(x + 37, y - 23, seed + 211);
  const matureBias = grove ? groveFalloff(x, y, grove) : 0;
  const roll = random() * 0.75 + noise * 0.25;

  if (roll < 0.08) {
    return "seed";
  }

  if (roll < 0.28 - matureBias * 0.12) {
    return "growing";
  }

  return "grown";
}

function elapsedForStage(
  definition: PlantDefinition,
  stage: PlantStage,
  random: () => number,
): number {
  if (stage === "grown") {
    return definition.growthSeconds;
  }

  if (stage === "growing") {
    const start = definition.growthSeconds * definition.growthThresholds.seed;
    const end = definition.growthSeconds * definition.growthThresholds.growing;

    return start + (end - start) * (0.2 + random() * 0.75);
  }

  if (stage === "seed") {
    return (
      definition.growthSeconds * definition.growthThresholds.seed * random()
    );
  }

  return 0;
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

function isTooCloseToTree(
  x: number,
  y: number,
  occupied: ReadonlySet<string>,
): boolean {
  for (let dy = -minimumTreeDistance; dy <= minimumTreeDistance; dy += 1) {
    for (let dx = -minimumTreeDistance; dx <= minimumTreeDistance; dx += 1) {
      if (dx * dx + dy * dy > minimumTreeDistance * minimumTreeDistance) {
        continue;
      }

      if (occupied.has(cellKey(x + dx, y + dy))) {
        return true;
      }
    }
  }

  return false;
}

function octaveValueNoise(x: number, y: number, seed: number): number {
  return (
    valueNoise(x * 0.045, y * 0.045, seed) * 0.58 +
    valueNoise(x * 0.11, y * 0.11, seed + 17) * 0.3 +
    valueNoise(x * 0.23, y * 0.23, seed + 43) * 0.12
  );
}

function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const tx = smoothstep(x - x0);
  const ty = smoothstep(y - y0);
  const a = hashToUnit(x0, y0, seed);
  const b = hashToUnit(x1, y0, seed);
  const c = hashToUnit(x0, y1, seed);
  const d = hashToUnit(x1, y1, seed);

  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hashToUnit(x: number, y: number, seed: number): number {
  let hash = x * 374761393 + y * 668265263 + seed * 1442695041;

  hash = (hash ^ (hash >>> 13)) * 1274126177;
  hash = hash ^ (hash >>> 16);

  return ((hash >>> 0) % 10000) / 10000;
}

function createMulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let result = state;

    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);

    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

function shuffle<T>(items: T[], random: () => number): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const value = items[index];

    items[index] = items[swapIndex];
    items[swapIndex] = value;
  }

  return items;
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}
