#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { loadEnvFile } from "node:process";

import { runObjectSpriteWorkflow } from "./object-sprite-workflow.js";
import { treeSpriteDefinitions } from "./tree-sprite-definitions.js";
import type { ObjectSpriteState } from "./schemas.js";

type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

type CliOptions = {
  treeId?: string;
  out?: string;
  imageModel?: string;
  reasoningEffort?: ReasoningEffort;
  help?: boolean;
};

loadNearestEnvFile();

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

const selectedTrees = options.treeId
  ? treeSpriteDefinitions.filter((tree) => tree.id === options.treeId)
  : treeSpriteDefinitions;
const styleReferencePath = resolveInputPath(
  "apps/game/src/assets/autotiles/vibrant-grass/autotile-blob-7x7.png",
);

if (selectedTrees.length === 0) {
  throw new Error(`Unknown tree id "${options.treeId}".`);
}

for (const tree of selectedTrees) {
  const outputDir = options.out
    ? selectedTrees.length === 1
      ? options.out
      : join(options.out, tree.id)
    : `generated/object-sprites/${tree.id}`;

  const manifest = await runObjectSpriteWorkflow({
    spriteKind: "tree",
    objectId: tree.id,
    objectName: tree.name,
    objectPrompt: `${tree.prompt}; readable as a small top-down farming and forest game tree`,
    stylePrompt: defaultTreeStylePrompt(),
    styleReferencePath,
    styleReferenceCell: { row: 1, column: 1, cellSize: 256 },
    imageModel:
      options.imageModel ??
      process.env.OPENROUTER_IMAGE_MODEL ??
      "google/gemini-2.5-flash-image",
    reasoningEffort:
      options.reasoningEffort ??
      parseReasoningEffort(process.env.OPENROUTER_REASONING_EFFORT ?? "high"),
    states: defaultTreeStates(),
    columns: 4,
    columnLabels: ["step 1", "step 2", "step 3", "step 4"],
    cellSize: 192,
    background: "transparent",
    outputDir,
  });

  console.log(JSON.stringify(manifest, null, 2));
}

function defaultTreeStates(): ObjectSpriteState[] {
  return [
    {
      id: "seed",
      title: "Seed",
      prompt:
        "column 1 is an isolated collectible tree seed, nut, pit, cone, or sapling item with no dirt; columns 2-4 are planted seed and tiny sapling steps rooted in soil",
    },
    {
      id: "growing",
      title: "Growing",
      prompt:
        "progressive sapling-to-young-tree growth steps, with trunk height and canopy volume increasing while the root point stays fixed",
    },
    {
      id: "grown",
      title: "Grown",
      prompt:
        "different stable mature harvest-ready tree variants with consistent species identity, not animation frames",
    },
    {
      id: "harvested",
      title: "Harvested",
      prompt:
        "columns 1-2 are post-harvest tree remnants such as a pruned canopy, stump, or tapped trunk; columns 3-4 are isolated harvested tree resource pickups",
    },
  ];
}

function defaultTreeStylePrompt(): string {
  return [
    "cozy hand-painted 2D game tree sprite",
    "three-quarter top-down view",
    "bottom-center rooted anchor point",
    "strong readable trunk and canopy silhouette",
    "soft natural edges",
    "warm but balanced highlights",
    "no outlines heavier than the terrain art",
    "transparent background",
  ].join(", ");
}

function parseArgs(args: string[]): CliOptions {
  const parsed: CliOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    switch (arg) {
      case "--":
        break;
      case "--tree-id":
        parsed.treeId = readValue(arg, next);
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

function resolveInputPath(filePath: string): string {
  if (existsSync(filePath)) {
    return filePath;
  }

  const originalCwd = process.env.INIT_CWD;
  const originalCwdPath = originalCwd ? join(originalCwd, filePath) : undefined;

  if (originalCwdPath && existsSync(originalCwdPath)) {
    return originalCwdPath;
  }

  throw new Error(`Style reference image not found: ${filePath}`);
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
  const treeIds = treeSpriteDefinitions.map((tree) => tree.id).join(", ");

  console.log(`Generate Pantheon tree object sprite sheets.

Usage:
  pnpm --filter @pantheon/assets generate-tree-sprites
  pnpm --filter @pantheon/assets generate-tree-sprites -- --tree-id applewood

Options:
      --tree-id <id>         Generate one tree. Known ids: ${treeIds}
      --image-model <model>  OpenRouter image-capable model id.
      --reasoning-effort <n> none, minimal, low, medium, high, xhigh. Default: high.
  -o, --out <dir>            Output directory. Default: generated/object-sprites/<tree-id>.
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
