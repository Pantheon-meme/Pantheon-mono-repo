#!/usr/bin/env node
import { spawn } from "node:child_process";

import { uniswapRegionTerrainAssets } from "./biome-terrain-definitions.js";
import {
  uniswapBiomeCreativeBrief,
  uniswapBiomeObjectSheets,
  uniswapBiomePlantSprites,
} from "./uniswap-biome-asset-plan.js";

type AssetGroup = "terrains" | "objects" | "plants";

type CliOptions = {
  only?: AssetGroup;
  skip?: Set<AssetGroup>;
  publish?: boolean;
  dryRun?: boolean;
  help?: boolean;
  terrainConcurrency?: number;
  concurrency?: number;
};

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

const commands = buildCommands(options);

console.log("[uniswap-biome] Creative brief:");
console.log(uniswapBiomeCreativeBrief);
console.log("");
console.log(`[uniswap-biome] Terrain targets: ${uniswapRegionTerrainAssets.length}`);
console.log(`[uniswap-biome] Object sheet targets: ${uniswapBiomeObjectSheets.length}`);
console.log(`[uniswap-biome] Plant/tree targets: ${uniswapBiomePlantSprites.length}`);
console.log("");

if (options.dryRun) {
  for (const command of commands) {
    console.log(formatCommand(command));
  }
  process.exit(0);
}

for (const command of commands) {
  console.log(`[uniswap-biome] Running ${formatCommand(command)}`);
  await run(command);
}

type Command = {
  bin: string;
  args: string[];
};

function buildCommands(options: CliOptions): Command[] {
  const allGroups: AssetGroup[] = ["terrains", "objects", "plants"];
  const groups: AssetGroup[] = options.only
    ? [options.only]
    : allGroups.filter(
        (group) => !options.skip?.has(group),
      );
  const commands: Command[] = [];

  if (groups.includes("terrains")) {
    commands.push({
      bin: "pnpm",
      args: [
        "--filter",
        "@pantheon/assets",
        "generate-biome-terrain-assets",
        "--",
        "--terrain-concurrency",
        String(options.terrainConcurrency ?? 3),
        "--concurrency",
        String(options.concurrency ?? 5),
      ],
    });

    if (options.publish) {
      commands.push({
        bin: "pnpm",
        args: ["--filter", "@pantheon/assets", "publish-game-assets"],
      });
    }
  }

  if (groups.includes("objects")) {
    commands.push({
      bin: "pnpm",
      args: [
        "--filter",
        "@pantheon/assets",
        "generate-biome-object-sprites",
        "--",
        "--all",
      ],
    });
  }

  if (groups.includes("plants")) {
    commands.push({
      bin: "pnpm",
      args: [
        "--filter",
        "@pantheon/assets",
        "generate-biome-plant-sprites",
      ],
    });
  }

  if (options.publish) {
    if (groups.includes("objects") || groups.includes("plants")) {
      commands.push({
        bin: "pnpm",
        args: ["--filter", "@pantheon/assets", "publish-object-sprites"],
      });
    }
  }

  return commands;
}

function run(command: Command): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command.bin, command.args, {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${formatCommand(command)} exited with ${code ?? "unknown"}`));
    });
  });
}

function parseArgs(args: string[]): CliOptions {
  const parsed: CliOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    switch (arg) {
      case "--":
        break;
      case "--only":
        parsed.only = parseAssetGroup(readValue(arg, next));
        index += 1;
        break;
      case "--skip":
        parsed.skip ??= new Set<AssetGroup>();
        for (const group of readValue(arg, next).split(",")) {
          parsed.skip.add(parseAssetGroup(group));
        }
        index += 1;
        break;
      case "--publish":
        parsed.publish = true;
        break;
      case "--dry-run":
        parsed.dryRun = true;
        break;
      case "--terrain-concurrency":
        parsed.terrainConcurrency = Number.parseInt(readValue(arg, next), 10);
        index += 1;
        break;
      case "--concurrency":
        parsed.concurrency = Number.parseInt(readValue(arg, next), 10);
        index += 1;
        break;
      case "--help":
      case "-h":
        parsed.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function parseAssetGroup(value: string): AssetGroup {
  const trimmed = value.trim();

  switch (trimmed) {
    case "terrains":
    case "objects":
    case "plants":
      return trimmed;
    default:
      throw new Error(`Invalid asset group "${value}". Use terrains, objects, or plants.`);
  }
}

function readValue(flag: string, value: string | undefined): string {
  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for ${flag}.`);
  }

  return value.trim();
}

function formatCommand(command: Command): string {
  return [command.bin, ...command.args.map((arg) => JSON.stringify(arg))].join(" ");
}

function printHelp(): void {
  console.log(`Generate the full Uniswap biome asset plan from one creative brief.

Usage:
  pnpm --filter @pantheon/assets generate-uniswap-biome-assets
  pnpm --filter @pantheon/assets generate-uniswap-biome-assets -- --dry-run
  pnpm --filter @pantheon/assets generate-uniswap-biome-assets -- --only terrains
  pnpm --filter @pantheon/assets generate-uniswap-biome-assets -- --skip plants --publish

What it generates:
  terrains  ${uniswapRegionTerrainAssets.length} region terrain autotile sets
  objects   ${uniswapBiomeObjectSheets.length} batched habitat prop sheets
  plants    ${uniswapBiomePlantSprites.length} region/terrain-specific plant and tree sheets

Options:
      --only <group>             Generate one group: terrains, objects, or plants.
      --skip <groups>            Comma-separated groups to skip.
      --publish                  Publish generated assets into apps/game after generation.
      --dry-run                  Print the plan and commands without generating.
      --terrain-concurrency <n>  Parallel terrain generations. Default: 3.
      --concurrency <n>          Parallel autotile mask requests per terrain. Default: 5.
  -h, --help                     Show this help.`);
}
