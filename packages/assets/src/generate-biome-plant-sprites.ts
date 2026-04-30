#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

import { runObjectSpriteWorkflow } from "./object-sprite-workflow.js";
import type { ObjectSpriteState } from "./schemas.js";
import {
  uniswapBiomeCreativeBrief,
  uniswapBiomePlantSprites,
  type BiomePlantSpriteDefinition,
} from "./uniswap-biome-asset-plan.js";

type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

type CliOptions = {
  plantId?: string;
  regionId?: string;
  imageModel?: string;
  reasoningEffort?: ReasoningEffort;
  out?: string;
  help?: boolean;
};

const currentFilePath = fileURLToPath(import.meta.url);
const packageRoot = resolve(dirname(currentFilePath), "..");
const repoRoot = resolve(packageRoot, "../..");

loadNearestEnvFile();

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

const selectedPlants = uniswapBiomePlantSprites.filter(
  (plant) =>
    (!options.plantId || plant.id === options.plantId) &&
    (!options.regionId || plant.regionId === options.regionId),
);

if (selectedPlants.length === 0) {
  throw new Error(
    `No biome plant sprites matched plant-id="${options.plantId ?? "*"}" region-id="${options.regionId ?? "*"}.`,
  );
}

for (const plant of selectedPlants) {
  const outputDir = options.out
    ? selectedPlants.length === 1
      ? options.out
      : join(options.out, plant.id)
    : `generated/object-sprites/${plant.id}`;

  const manifest = await runObjectSpriteWorkflow({
    spriteKind: plant.kind,
    objectId: plant.id,
    objectName: plant.name,
    objectPrompt: buildPlantPrompt(plant),
    stylePrompt: buildStylePrompt(plant),
    styleReferencePath: resolve(
      repoRoot,
      `apps/game/src/assets/autotiles/${plant.styleReferenceTerrainId}/autotile-blob-7x7.png`,
    ),
    styleReferenceCell: { row: 1, column: 1, cellSize: 256 },
    imageModel:
      options.imageModel ??
      process.env.OPENROUTER_IMAGE_MODEL ??
      "google/gemini-2.5-flash-image",
    reasoningEffort:
      options.reasoningEffort ??
      parseReasoningEffort(process.env.OPENROUTER_REASONING_EFFORT ?? "high"),
    states: plant.kind === "tree" ? treeStates() : plantStates(),
    columns: 4,
    columnLabels: ["step 1", "step 2", "step 3", "step 4"],
    cellSize: plant.kind === "tree" ? 256 : 128,
    background: "transparent",
    outputDir,
  });

  console.log(JSON.stringify(manifest, null, 2));
}

function buildPlantPrompt(plant: BiomePlantSpriteDefinition): string {
  return [
    uniswapBiomeCreativeBrief,
    `${plant.name}: ${plant.prompt}.`,
    `Region: ${plant.regionId}.`,
    `Allowed terrain habitat ids: ${plant.terrainIds.join(", ")}.`,
    plant.kind === "tree"
      ? "This tree must look native to its terrain and region. Do not make watery-terrain variants look like ordinary dry-land trees."
      : "This is a ground, wetland, vine, moss, flower, or crop-like biome plant. Keep it lower and smaller than trees.",
  ].join("\n");
}

function buildStylePrompt(plant: BiomePlantSpriteDefinition): string {
  return [
    plant.kind === "tree"
      ? "cozy hand-painted 2D game tree sprite"
      : "cozy hand-painted 2D game plant sprite",
    "three-quarter top-down view",
    "transparent background",
    "readable silhouette at gameplay scale",
    "Uniswap-inspired violet, mint, pearl, pink, cyan, teal, and lavender-gray palette",
    `native to ${plant.regionId}`,
    `visually compatible with ${plant.terrainIds.join(", ")}`,
    "soft natural edges",
    "warm but balanced highlights",
    "no readable text",
    "no logos",
    "no UI",
  ].join(", ");
}

function treeStates(): ObjectSpriteState[] {
  return [
    {
      id: "seed",
      title: "Seed",
      prompt:
        "column 1 is an isolated collectible region-specific seed, pod, crystal nut, cone, or sapling item with no dirt; columns 2-4 are planted seed and tiny sapling steps rooted in matching terrain",
    },
    {
      id: "growing",
      title: "Growing",
      prompt:
        "progressive sapling-to-young-tree growth steps that preserve the region-specific terrain adaptation",
    },
    {
      id: "grown",
      title: "Grown",
      prompt:
        "different stable mature harvest-ready tree variants with consistent species identity, native terrain roots, and readable canopy silhouettes",
    },
    {
      id: "harvested",
      title: "Harvested",
      prompt:
        "columns 1-2 are post-harvest tree remnants left in the ground; columns 3-4 are isolated harvested region-specific resource pickups",
    },
  ];
}

function plantStates(): ObjectSpriteState[] {
  return [
    {
      id: "seed",
      title: "Seed",
      prompt:
        "column 1 is an isolated collectible seed, bulb, spore, pearl, or cutting with no dirt; columns 2-4 are planted seed growth steps rooted in matching terrain",
    },
    {
      id: "growing",
      title: "Growing",
      prompt: "progressive young growth steps for the region-specific ground plant",
    },
    {
      id: "grown",
      title: "Grown",
      prompt:
        "different stable mature variants of the same region-specific plant, not animation frames",
    },
    {
      id: "harvested",
      title: "Harvested",
      prompt:
        "columns 1-2 are post-harvest plant remnants; columns 3-4 are isolated harvested crop/resource pickups",
    },
  ];
}

function parseArgs(args: string[]): CliOptions {
  const parsed: CliOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    switch (arg) {
      case "--":
        break;
      case "--plant-id":
        parsed.plantId = readValue(arg, next);
        index += 1;
        break;
      case "--region-id":
        parsed.regionId = readValue(arg, next);
        index += 1;
        break;
      case "--image-model":
        parsed.imageModel = readValue(arg, next);
        index += 1;
        break;
      case "--reasoning-effort":
        parsed.reasoningEffort = parseReasoningEffort(readValue(arg, next));
        index += 1;
        break;
      case "--out":
      case "-o":
        parsed.out = readValue(arg, next);
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

function readValue(flag: string, value: string | undefined): string {
  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for ${flag}.`);
  }

  return value.trim();
}

function parseReasoningEffort(value: string): ReasoningEffort {
  const effort = value.trim();

  switch (effort) {
    case "none":
    case "minimal":
    case "low":
    case "medium":
    case "high":
    case "xhigh":
      return effort;
    default:
      throw new Error(`Invalid reasoning effort: ${value}`);
  }
}

function printHelp(): void {
  const plantIds = uniswapBiomePlantSprites.map((plant) => plant.id).join(", ");

  console.log(`Generate Uniswap biome-specific plant and tree sprite sheets.

Usage:
  pnpm --filter @pantheon/assets generate-biome-plant-sprites
  pnpm --filter @pantheon/assets generate-biome-plant-sprites -- --region-id liquidity-marsh
  pnpm --filter @pantheon/assets generate-biome-plant-sprites -- --plant-id oracle-fen-moonwillow

Options:
      --plant-id <id>        Generate one biome plant. Known ids: ${plantIds}
      --region-id <id>       Generate all plant sprites for one region.
      --image-model <model>  OpenRouter image-capable model id.
      --reasoning-effort <n> none, minimal, low, medium, high, xhigh. Default: high.
  -o, --out <dir>            Output directory. Default: generated/object-sprites/<plant-id>.
  -h, --help                 Show this help.`);
}

function loadNearestEnvFile(): void {
  const envPath = findNearestFile(".env", process.cwd());

  if (envPath) {
    loadEnvFile(envPath);
  }
}

function findNearestFile(
  fileName: string,
  startDir: string,
): string | undefined {
  let currentDir = startDir;
  const rootDir = parse(startDir).root;

  while (true) {
    const candidate = join(currentDir, fileName);

    if (existsSync(candidate)) {
      return candidate;
    }

    if (currentDir === rootDir) {
      return undefined;
    }

    currentDir = dirname(currentDir);
  }
}
