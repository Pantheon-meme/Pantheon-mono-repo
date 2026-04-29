#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

import { runObjectSpriteWorkflow } from "./object-sprite-workflow.js";
import {
  uniswapBiomeObjectSheets,
  uniswapCommonsObjectSheetId,
} from "./biome-object-sprite-definitions.js";
import type { ObjectSpriteState } from "./schemas.js";
import type { BiomeObjectSheetDefinition } from "./uniswap-biome-asset-plan.js";

type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

type CliOptions = {
  sheetId?: string;
  all?: boolean;
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

const selectedSheets = options.all
  ? uniswapBiomeObjectSheets
  : [
      getObjectSheet(
        options.sheetId ?? uniswapCommonsObjectSheetId,
      ),
    ];

for (const sheet of selectedSheets) {
  const outputDir = options.out
    ? selectedSheets.length === 1
      ? options.out
      : join(options.out, sheet.id)
    : `generated/object-sprites/${sheet.id}`;

  const manifest = await runObjectSpriteWorkflow({
    spriteKind: "object-batch",
    objectId: sheet.id,
    objectName: sheet.name,
    objectPrompt: buildObjectPrompt(sheet),
    stylePrompt: buildStylePrompt(sheet),
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
    cellSize: 256,
    background: "transparent",
    outputDir,
  });

  console.log(JSON.stringify(manifest, null, 2));
}

function buildStylePrompt(sheet: BiomeObjectSheetDefinition): string {
  return [
    "cozy hand-painted 2D biome scatter props",
    "three-quarter top-down view",
    "transparent background",
    "crisp readable silhouettes at small scale",
    "Uniswap-inspired violet, mint, pearl, pink, cyan, and lavender-gray palette",
    sheet.regionId
      ? `props must feel native to ${sheet.regionId}`
      : "natural stones, bushes, reeds, moss, crystals, flowers, roots, puddles, and fallen branches",
    "soft natural edges",
    "warm but balanced highlights",
    "no readable text",
    "no logos",
    "no UI",
  ].join(", ");
}

function buildObjectPrompt(sheet: BiomeObjectSheetDefinition): string {
  return [
    sheet.prompt,
    "A cost-efficient batch sheet of separate static Uniswap biome and land scatter props.",
    "Each cell is a different independent object, not a variant or animation frame.",
    "These are natural biome objects for terrain richness: stones, bushes, reeds, moss, flowers, crystals, puddles, roots, fallen branches, and magical habitat details.",
    "Avoid buildings, furniture, civic architecture, tools, signs, benches, tables, and town decorations.",
    "Use the row and column map exactly.",
    ...sheet.objects.map(
      (sprite) =>
        `Row ${sprite.row} column ${sprite.column}: ${sprite.name} - ${sprite.prompt}.`,
    ),
  ].join("\n");
}

function buildRows(sheet: BiomeObjectSheetDefinition): ObjectSpriteState[] {
  return Array.from({ length: 4 }, (_, row) => {
    const sprites = sheet.objects
      .filter((sprite) => sprite.row === row)
      .sort((a, b) => a.column - b.column);

    return {
      id: `row-${row}`,
      title: `Prop Row ${row}`,
      prompt: sprites
        .map(
          (sprite) =>
            `column ${sprite.column}: ${sprite.name} - ${sprite.prompt}`,
        )
        .join("; "),
    };
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
      case "--sheet-id":
        parsed.sheetId = readValue(arg, next);
        index += 1;
        break;
      case "--all":
        parsed.all = true;
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

function getObjectSheet(sheetId: string): BiomeObjectSheetDefinition {
  const sheet = uniswapBiomeObjectSheets.find((candidate) => candidate.id === sheetId);

  if (!sheet) {
    throw new Error(`Unknown biome object sheet "${sheetId}".`);
  }

  return sheet;
}

function printHelp(): void {
  const sheetIds = uniswapBiomeObjectSheets.map((sheet) => sheet.id).join(", ");

  console.log(`Generate batched static biome object sprite sheets.

Usage:
  pnpm --filter @pantheon/assets generate-biome-object-sprites
  pnpm --filter @pantheon/assets generate-biome-object-sprites -- --all

Options:
      --sheet-id <id>          Sheet to generate. Default: ${uniswapCommonsObjectSheetId}. Known ids: ${sheetIds}
      --all                    Generate every Uniswap biome object sheet.
      --image-model <model>    OpenRouter image-capable model id.
      --reasoning-effort <n>   none, minimal, low, medium, high, xhigh. Default: high.
  -o, --out <dir>              Output directory. Default: generated/object-sprites/<sheet-id>.
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
