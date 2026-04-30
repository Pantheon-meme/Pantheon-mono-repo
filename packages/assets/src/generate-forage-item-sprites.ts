#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

import { forageItemSpriteSheets } from "./forage-item-sprite-definitions.js";
import { runObjectSpriteWorkflow } from "./object-sprite-workflow.js";
import type { ObjectSpriteState } from "./schemas.js";

type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

type CliOptions = {
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

const manifests = await Promise.all(
  forageItemSpriteSheets.map((sheet) =>
    runObjectSpriteWorkflow({
      spriteKind: "object-batch",
      objectId: sheet.id,
      objectName: sheet.name,
      objectPrompt: buildObjectPrompt(sheet),
      stylePrompt: buildStylePrompt(),
      styleReferencePath: resolve(
        repoRoot,
        `apps/game/src/assets/autotiles/${sheet.styleReferenceTerrainId}/autotile-blob-7x7.png`,
      ),
      styleReferenceCell: {
        row: 1,
        column: 1,
        cellSize: 256,
      },
      imageModel:
        options.imageModel ??
        process.env.OPENROUTER_IMAGE_MODEL ??
        "google/gemini-2.5-flash-image",
      reasoningEffort:
        options.reasoningEffort ??
        parseReasoningEffort(process.env.OPENROUTER_REASONING_EFFORT ?? "high"),
      states: buildRows(sheet),
      columns: 4,
      columnLabels: ["slot 1", "slot 2", "slot 3", "slot 4"],
      cellSize: 128,
      background: "transparent",
      outputDir: options.out ? join(options.out, sheet.id) : `generated/object-sprites/${sheet.id}`,
    }),
  ),
);

for (const manifest of manifests) {
  console.log(JSON.stringify(manifest, null, 2));
}

function buildStylePrompt(): string {
  return [
    "cozy hand-painted 2D game item pickups",
    "three-quarter top-down view",
    "transparent background",
    "crisp readable silhouettes at 32 pixel gameplay size",
    "small isolated resource icons centered in each cell",
    "Uniswap-inspired violet, mint, pearl, pink, cyan, teal, and lavender-gray palette",
    "soft natural edges",
    "warm but balanced highlights",
    "no readable text",
    "no logos",
    "no UI",
  ].join(", ");
}

function buildObjectPrompt(
  sheet: (typeof forageItemSpriteSheets)[number],
): string {
  return [
    "A batch sheet of separate static forage resource item pickups for a cozy top-down onchain farming/adventure game.",
    "Each cell is one independent inventory/resource pickup, not an animation frame.",
    "Every item should be readable as a small 32px world drop while still painted at high resolution.",
    "Use the row and column map exactly.",
    ...sheet.items.map(
      (item, index) =>
        `Row ${Math.floor(index / 4)} column ${index % 4}: ${item.name} (${item.itemId}) - ${item.prompt}.`,
    ),
  ].join("\n");
}

function buildRows(
  sheet: (typeof forageItemSpriteSheets)[number],
): ObjectSpriteState[] {
  return Array.from({ length: 4 }, (_, row) => ({
    id: `row-${row}`,
    title: `Forage Item Row ${row}`,
    prompt: sheet.items
      .slice(row * 4, row * 4 + 4)
      .map(
        (item, column) =>
          `column ${column}: ${item.name} (${item.itemId}) - ${item.prompt}`,
      )
      .join("; "),
  }));
}

function parseArgs(args: string[]): CliOptions {
  const parsed: CliOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    switch (arg) {
      case "--":
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
  console.log(`Generate two 4x4 forage item sprite sheets in parallel.

Usage:
  pnpm --filter @pantheon/assets generate-forage-item-sprites

Options:
      --image-model <model>    OpenRouter image-capable model id.
      --reasoning-effort <n>   none, minimal, low, medium, high, xhigh. Default: high.
  -o, --out <dir>              Output root. Default: generated/object-sprites.
  -h, --help                   Show this help.`);
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
