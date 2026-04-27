#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { loadEnvFile } from "node:process";

import { runObjectSpriteWorkflow } from "./object-sprite-workflow.js";
import type { ObjectSpriteState } from "./schemas.js";

type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

type CliOptions = {
  plantId?: string;
  plantName?: string;
  plantPrompt?: string;
  playerId?: string;
  playerName?: string;
  playerPrompt?: string;
  spriteKind?: "object" | "plant" | "player";
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
const requestOptions = applyPlayerDefaults(applyPlantDefaults(options));

if (requestOptions.help || !requestOptions.objectId || !requestOptions.objectName || !requestOptions.objectPrompt || !requestOptions.stylePrompt) {
  printHelp();
  process.exit(requestOptions.help ? 0 : 1);
}

const styleReferencePath = requestOptions.styleReference ? resolveInputPath(requestOptions.styleReference) : undefined;

if (requestOptions.styleReferenceCell && !requestOptions.styleReference) {
  throw new Error("--style-reference-cell requires --style-reference.");
}

const columns = requestOptions.columns ?? Number.parseInt(process.env.PANTHEON_OBJECT_SPRITE_COLUMNS ?? "4", 10);
const columnLabels = requestOptions.columnLabels ?? parseList(process.env.PANTHEON_OBJECT_SPRITE_COLUMN_LABELS);

if (columnLabels && columnLabels.length > columns) {
  throw new Error(`Received ${columnLabels.length} column labels for only ${columns} columns.`);
}

const manifest = await runObjectSpriteWorkflow({
  spriteKind: requestOptions.spriteKind ?? "object",
  objectId: requestOptions.objectId,
  objectName: requestOptions.objectName,
  objectPrompt: requestOptions.objectPrompt,
  stylePrompt: requestOptions.stylePrompt,
  styleReferencePath,
  styleReferenceCell: requestOptions.styleReferenceCell,
  imageModel: requestOptions.imageModel ?? process.env.OPENROUTER_IMAGE_MODEL ?? "google/gemini-2.5-flash-image",
  reasoningEffort: requestOptions.reasoningEffort ?? parseReasoningEffort(process.env.OPENROUTER_REASONING_EFFORT ?? "high"),
  states: requestOptions.states && requestOptions.states.length > 0 ? requestOptions.states : defaultPlantStates(),
  columns,
  columnLabels,
  cellSize: requestOptions.cellSize ?? Number.parseInt(process.env.PANTHEON_OBJECT_SPRITE_CELL_SIZE ?? "128", 10),
  background: requestOptions.background ?? parseBackground(process.env.PANTHEON_OBJECT_SPRITE_BACKGROUND ?? "transparent"),
  outputDir: requestOptions.out ?? "generated/object-sprites",
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
      case "--plant-id":
        parsed.plantId = readValue(arg, next);
        index += 1;
        break;
      case "--plant-name":
        parsed.plantName = readValue(arg, next);
        index += 1;
        break;
      case "--plant":
        parsed.plantPrompt = readValue(arg, next);
        index += 1;
        break;
      case "--player-id":
        parsed.playerId = readValue(arg, next);
        index += 1;
        break;
      case "--player-name":
        parsed.playerName = readValue(arg, next);
        index += 1;
        break;
      case "--player":
        parsed.playerPrompt = readValue(arg, next);
        index += 1;
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

function applyPlantDefaults(options: CliOptions): CliOptions {
  if (!options.plantId && !options.plantName && !options.plantPrompt) {
    return options;
  }

  const plantName = options.plantName ?? options.objectName ?? titleCase(options.plantId ?? "plant");
  const plantId = options.plantId ?? options.objectId ?? slugify(plantName);
  const plantPrompt = options.plantPrompt ?? options.objectPrompt;

  if (!plantPrompt) {
    throw new Error("--plant requires a plant description.");
  }

  return {
    ...options,
    spriteKind: options.spriteKind ?? "plant",
    objectId: options.objectId ?? plantId,
    objectName: options.objectName ?? plantName,
    objectPrompt: options.objectPrompt ?? `${plantPrompt}; readable as a small top-down farming game crop`,
    stylePrompt: options.stylePrompt ?? defaultPlantStylePrompt(),
    styleReference: options.styleReference ?? "apps/game/src/assets/autotiles/vibrant-grass/autotile-blob-7x7.png",
    styleReferenceCell: options.styleReferenceCell ?? { row: 1, column: 1, cellSize: 256 },
    states: options.states ?? defaultPlantStates(),
    columns: options.columns ?? 4,
    columnLabels: options.columnLabels ?? ["step 1", "step 2", "step 3", "step 4"],
    cellSize: options.cellSize ?? 128,
    background: options.background ?? "transparent",
    out: options.out ?? `generated/object-sprites/${plantId}`,
  };
}

function applyPlayerDefaults(options: CliOptions): CliOptions {
  if (!options.playerId && !options.playerName && !options.playerPrompt) {
    return options;
  }

  const playerName = options.playerName ?? options.objectName ?? titleCase(options.playerId ?? "player");
  const playerId = options.playerId ?? options.objectId ?? slugify(playerName);
  const playerPrompt = options.playerPrompt ?? options.objectPrompt;

  if (!playerPrompt) {
    throw new Error("--player requires a character description.");
  }

  return {
    ...options,
    spriteKind: options.spriteKind ?? "player",
    objectId: options.objectId ?? playerId,
    objectName: options.objectName ?? playerName,
    objectPrompt: options.objectPrompt ?? `${playerPrompt}; readable as a small top-down farming/adventure game player character`,
    stylePrompt: options.stylePrompt ?? defaultPlayerStylePrompt(),
    styleReference: options.styleReference ?? "apps/game/src/assets/autotiles/vibrant-grass/autotile-blob-7x7.png",
    styleReferenceCell: options.styleReferenceCell ?? (options.styleReference ? undefined : { row: 1, column: 1, cellSize: 256 }),
    states: options.states ?? defaultPlayerStates(),
    columns: options.columns ?? 4,
    columnLabels: options.columnLabels ?? ["down", "side", "up", "action"],
    cellSize: options.cellSize ?? 128,
    background: options.background ?? "transparent",
    out: options.out ?? `generated/object-sprites/${playerId}`,
  };
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
      prompt: "column 1 is an isolated collectible seed item with no dirt; columns 2-4 are planted seed growth steps with soil and a tiny sprout",
    },
    {
      id: "growing",
      title: "Growing",
      prompt: "progressive growth steps from young sprout to nearly mature plant",
    },
    {
      id: "grown",
      title: "Grown",
      prompt: "different stable variants of the mature harvest-ready plant, not animation frames",
    },
    {
      id: "harvested",
      title: "Harvested",
      prompt: "columns 1-2 are post-harvest plant remnants left in the ground; columns 3-4 are isolated harvested crop resource pickups",
    },
  ];
}

function defaultPlantStylePrompt(): string {
  return [
    "cozy hand-painted 2D game sprite",
    "three-quarter top-down view",
    "crisp readable silhouette",
    "soft natural edges",
    "warm but balanced highlights",
    "no outlines heavier than the terrain art",
    "transparent background",
  ].join(", ");
}

function defaultPlayerStates(): ObjectSpriteState[] {
  return [
    {
      id: "idle_1",
      title: "Idle 1",
      prompt: "first idle transition for each direction; feet planted, relaxed hands, calm breathing posture",
    },
    {
      id: "idle_2",
      title: "Idle 2",
      prompt: "second idle transition for each direction; opposite weight shift from idle_1, feet still planted",
    },
    {
      id: "move_1",
      title: "Move 1",
      prompt: "first walking contact pose for each direction; left foot leads, opposite arm swing",
    },
    {
      id: "move_2",
      title: "Move 2",
      prompt: "second walking contact pose for each direction; right foot leads, opposite arm swing",
    },
  ];
}

function defaultPlayerStylePrompt(): string {
  return [
    "cozy hand-painted 2D game character sprite",
    "three-quarter top-down view",
    "crisp readable silhouette",
    "soft natural edges",
    "consistent outfit and proportions",
    "no outlines heavier than the terrain art",
    "transparent background",
  ].join(", ");
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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

function printHelp(): void {
  console.log(`Generate a flexible object sprite sheet with OpenRouter.

Usage:
  pnpm --filter @pantheon/assets generate-object-sprites -- \\
    --player-id player \\
    --player-name "Player" \\
    --player "wandering farmer with simple tunic and boots"

  pnpm --filter @pantheon/assets generate-object-sprites -- \\
    --plant-id sungrain \\
    --plant-name "Sungrain" \\
    --plant "warm golden grain plant with sunlit wheat heads"

  pnpm --filter @pantheon/assets generate-object-sprites -- \\
    --object-id sungrain \\
    --object-name "Sungrain" \\
    --object "golden cereal plant..." \\
    --style "cozy top-down pixel-inspired hand-painted game sprite..." [options]

Options:
      --plant-id <id>          Plant shortcut id. Fills object id and output path.
      --plant-name <name>      Plant shortcut display name.
      --plant <brief>          Plant shortcut description; uses current plant sprite defaults.
      --player-id <id>         Player shortcut id. Use "player" for the main game player.
      --player-name <name>     Player shortcut display name.
      --player <brief>         Player shortcut description; uses 3x4 movement sprite defaults.
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
