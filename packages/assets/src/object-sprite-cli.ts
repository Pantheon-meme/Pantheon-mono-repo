#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { loadEnvFile } from "node:process";

import { runObjectSpriteWorkflow } from "./object-sprite-workflow.js";
import type { ObjectSpriteState } from "./schemas.js";

type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

type CliOptions = {
  objectId?: string;
  objectName?: string;
  objectPrompt?: string;
  stylePrompt?: string;
  styleReference?: string;
  styleReferenceCell?: {
    row: number;
    column: number;
    cellSize: number;
  };
  imageModel?: string;
  reasoningEffort?: ReasoningEffort;
  states?: ObjectSpriteState[];
  columns?: number;
  columnLabels?: string[];
  cellSize?: number;
  background?: "transparent" | "solid";
  out?: string;
  help?: boolean;
};

loadNearestEnvFile();

const options = parseArgs(process.argv.slice(2));

if (options.help || !options.objectId || !options.objectName || !options.objectPrompt || !options.stylePrompt) {
  printHelp();
  process.exit(options.help ? 0 : 1);
}

const styleReferencePath = options.styleReference ? resolveInputPath(options.styleReference) : undefined;

if (options.styleReferenceCell && !options.styleReference) {
  throw new Error("--style-reference-cell requires --style-reference.");
}

const columns = options.columns ?? Number.parseInt(process.env.PANTHEON_OBJECT_SPRITE_COLUMNS ?? "4", 10);
const columnLabels = options.columnLabels ?? parseList(process.env.PANTHEON_OBJECT_SPRITE_COLUMN_LABELS);

if (columnLabels && columnLabels.length > columns) {
  throw new Error(`Received ${columnLabels.length} column labels for only ${columns} columns.`);
}

const manifest = await runObjectSpriteWorkflow({
  objectId: options.objectId,
  objectName: options.objectName,
  objectPrompt: options.objectPrompt,
  stylePrompt: options.stylePrompt,
  styleReferencePath,
  styleReferenceCell: options.styleReferenceCell,
  imageModel: options.imageModel ?? process.env.OPENROUTER_IMAGE_MODEL ?? "google/gemini-2.5-flash-image",
  reasoningEffort: options.reasoningEffort ?? parseReasoningEffort(process.env.OPENROUTER_REASONING_EFFORT ?? "high"),
  states: options.states && options.states.length > 0 ? options.states : defaultPlantStates(),
  columns,
  columnLabels,
  cellSize: options.cellSize ?? Number.parseInt(process.env.PANTHEON_OBJECT_SPRITE_CELL_SIZE ?? "128", 10),
  background: options.background ?? parseBackground(process.env.PANTHEON_OBJECT_SPRITE_BACKGROUND ?? "transparent"),
  outputDir: options.out ?? "generated/object-sprites",
});

console.log(JSON.stringify(manifest, null, 2));

function parseArgs(args: string[]): CliOptions {
  const parsed: CliOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    switch (arg) {
      case "--":
        break;
      case "--object-id":
        parsed.objectId = readValue(arg, next);
        index += 1;
        break;
      case "--object-name":
        parsed.objectName = readValue(arg, next);
        index += 1;
        break;
      case "--object":
        parsed.objectPrompt = readValue(arg, next);
        index += 1;
        break;
      case "--style":
        parsed.stylePrompt = readValue(arg, next);
        index += 1;
        break;
      case "--style-reference":
        parsed.styleReference = readValue(arg, next);
        index += 1;
        break;
      case "--style-reference-cell":
        parsed.styleReferenceCell = parseStyleReferenceCell(readValue(arg, next));
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
      case "--state":
        parsed.states = [...(parsed.states ?? []), parseState(readValue(arg, next))];
        index += 1;
        break;
      case "--columns":
        parsed.columns = Number.parseInt(readValue(arg, next), 10);
        index += 1;
        break;
      case "--column-labels":
        parsed.columnLabels = parseRequiredList(readValue(arg, next));
        index += 1;
        break;
      case "--cell-size":
        parsed.cellSize = Number.parseInt(readValue(arg, next), 10);
        index += 1;
        break;
      case "--background":
        parsed.background = parseBackground(readValue(arg, next));
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

function parseState(value: string): ObjectSpriteState {
  const [id, title, ...promptParts] = value.split(":");

  if (!id || !title) {
    throw new Error(`Invalid state "${value}". Expected id:title or id:title:prompt.`);
  }

  return {
    id: id.trim(),
    title: title.trim(),
    prompt: promptParts.join(":").trim() || undefined,
  };
}

function parseStyleReferenceCell(value: string): { row: number; column: number; cellSize: number } {
  const [row, column, cellSize] = value.split(",").map((part) => Number.parseInt(part.trim(), 10));

  if (!Number.isInteger(row) || !Number.isInteger(column) || !Number.isInteger(cellSize)) {
    throw new Error(`Invalid style reference cell "${value}". Expected row,column,cellSize.`);
  }

  return { row, column, cellSize };
}

function defaultPlantStates(): ObjectSpriteState[] {
  return [
    {
      id: "seed",
      title: "Seed",
      prompt: "small planted seed or first sprout, low to the ground",
    },
    {
      id: "growing",
      title: "Growing",
      prompt: "young plant with clear leaves and early structure",
    },
    {
      id: "grown",
      title: "Grown",
      prompt: "mature harvest-ready plant with the strongest identifying features",
    },
    {
      id: "harvested",
      title: "Harvested",
      prompt: "post-harvest remnant, cut stem, root, or gathered bundle state",
    },
  ];
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

function parseRequiredList(value: string): string[] {
  const values = parseList(value);

  if (!values || values.length === 0) {
    throw new Error("Expected at least one comma-separated value.");
  }

  return values;
}

function parseList(value: string | undefined): string[] | undefined {
  const values = value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return values && values.length > 0 ? values : undefined;
}

function parseBackground(value: string): "transparent" | "solid" {
  const background = value.trim();

  switch (background) {
    case "transparent":
    case "solid":
      return background;
    default:
      throw new Error(`Invalid background: ${value}`);
  }
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
  console.log(`Generate a flexible object sprite sheet with OpenRouter.

Usage:
  pnpm --filter @pantheon/assets generate-object-sprites -- \\
    --object-id sungrain \\
    --object-name "Sungrain" \\
    --object "golden cereal plant..." \\
    --style "cozy top-down pixel-inspired hand-painted game sprite..." [options]

Options:
      --object-id <id>          Stable asset id, e.g. sungrain.
      --object-name <name>      Display name for prompt/manifest.
      --object <brief>          Object description and distinguishing details.
      --style <brief>           Text style guide for palette, rendering, perspective, and finish.
      --style-reference <path>  Optional image/tile reference for visual inspiration.
      --style-reference-cell <row,column,size>
                                Optional crop from the style reference image, useful for one tile from an atlas.
      --image-model <model>     OpenRouter image-capable model id.
      --reasoning-effort <n>    none, minimal, low, medium, high, xhigh. Default: high.
      --state <spec>            Row state as id:title or id:title:prompt. Can be repeated.
      --columns <n>             Grid cells per row. Default: 4.
      --column-labels <list>    Comma-separated frame labels. Default: frame 1, frame 2, ...
      --cell-size <px>          Cell size in pixels. Default: 128.
      --background <mode>       transparent or solid. Default: transparent.
  -o, --out <dir>               Output directory. Default: generated/object-sprites.
  -h, --help                    Show this help.`);
}

function loadNearestEnvFile(): void {
  const envPath = findNearestFile(".env", process.cwd());

  if (envPath) {
    loadEnvFile(envPath);
  }
}

function findNearestFile(fileName: string, startDir: string): string | undefined {
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
