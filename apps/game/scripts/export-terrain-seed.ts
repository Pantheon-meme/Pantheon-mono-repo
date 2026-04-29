import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  activeBiomeId,
  getActiveBiome,
  biomeDefinitions,
} from "../src/game/biome/BiomeDefinitions";
import {
  generateTerrainSeedRecords,
  type TerrainSeedRecord,
} from "../src/game/terrain/TerrainSeedRecords";

type TerrainSeedExport = {
  biomeId: string;
  gridWidth: number;
  gridHeight: number;
  tileSize: number;
  spawnTileX: number;
  spawnTileY: number;
  totalTiles: number;
  terrainCounts: Record<string, number>;
  records: TerrainSeedRecord[];
};

type ExportTerrainSeedOptions = {
  biomeId?: string;
  gridWidth?: number;
  gridHeight?: number;
  tileSize?: number;
  spawnTileX?: number;
  spawnTileY?: number;
  outputPath?: string;
};

const defaultGridWidth = 200;
const defaultGridHeight = 200;
const defaultTileSize = 256;

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const biome = options.biomeId
    ? biomeDefinitions[options.biomeId]
    : getActiveBiome();

  if (!biome) {
    throw new Error(`Unknown biome: ${options.biomeId ?? activeBiomeId}`);
  }

  const gridWidth = options.gridWidth ?? defaultGridWidth;
  const gridHeight = options.gridHeight ?? defaultGridHeight;
  const tileSize = options.tileSize ?? defaultTileSize;
  const spawnTileX = options.spawnTileX ?? Math.floor(gridWidth / 2);
  const spawnTileY = options.spawnTileY ?? Math.floor(gridHeight / 2);
  const records = generateTerrainSeedRecords({
    biome,
    gridWidth,
    gridHeight,
    tileSize,
    spawnTileX,
    spawnTileY,
  });
  const output: TerrainSeedExport = {
    biomeId: biome.id,
    gridWidth,
    gridHeight,
    tileSize,
    spawnTileX,
    spawnTileY,
    totalTiles: records.length,
    terrainCounts: countTerrains(records),
    records,
  };
  const outputPath =
    options.outputPath ??
    path.join("generated", "terrain-seed", `${biome.id}-${gridWidth}x${gridHeight}.json`);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

  console.log(`Wrote ${records.length} terrain tiles to ${outputPath}`);
  console.log(JSON.stringify(output.terrainCounts, null, 2));
}

function countTerrains(records: TerrainSeedRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const record of records) {
    counts[record.terrainId] = (counts[record.terrainId] ?? 0) + 1;
  }

  return counts;
}

function parseArgs(args: string[]): ExportTerrainSeedOptions {
  const parsed: ExportTerrainSeedOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    switch (arg) {
      case "--":
        break;
      case "--biome":
        parsed.biomeId = readValue(arg, next);
        index += 1;
        break;
      case "--width":
        parsed.gridWidth = readNumber(arg, next);
        index += 1;
        break;
      case "--height":
        parsed.gridHeight = readNumber(arg, next);
        index += 1;
        break;
      case "--tile-size":
        parsed.tileSize = readNumber(arg, next);
        index += 1;
        break;
      case "--spawn-x":
        parsed.spawnTileX = readNumber(arg, next);
        index += 1;
        break;
      case "--spawn-y":
        parsed.spawnTileY = readNumber(arg, next);
        index += 1;
        break;
      case "--out":
        parsed.outputPath = readValue(arg, next);
        index += 1;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return parsed;
}

function readValue(flag: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${flag} requires a value`);
  }

  return value;
}

function readNumber(flag: string, value: string | undefined): number {
  const parsed = Number(readValue(flag, value));

  if (!Number.isFinite(parsed)) {
    throw new Error(`${flag} must be a number`);
  }

  return parsed;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
