#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { loadEnvFile } from "node:process";

import { writeGeneratedImage } from "./files.js";
import { generateOpenRouterImage } from "./openrouter.js";
import { runAutotileWorkflow } from "./autotile-workflow.js";

type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

type CliOptions = {
  terrainId?: string;
  material?: string;
  texturePrompt?: string;
  stylePrompt?: string;
  imageModel?: string;
  reasoningEffort?: ReasoningEffort;
  maskDir?: string;
  concurrency?: number;
  textureOut?: string;
  autotileOut?: string;
  help?: boolean;
};

loadNearestEnvFile();

const options = parseArgs(process.argv.slice(2));

if (
  options.help ||
  !options.terrainId ||
  !options.material ||
  !options.texturePrompt ||
  !options.stylePrompt
) {
  printHelp();
  process.exit(options.help ? 0 : 1);
}

const terrainId = options.terrainId;
const imageModel =
  options.imageModel ??
  process.env.OPENROUTER_IMAGE_MODEL ??
  "google/gemini-2.5-flash-image";
const reasoningEffort =
  options.reasoningEffort ??
  parseReasoningEffort(process.env.OPENROUTER_REASONING_EFFORT ?? "high");
const textureOut = options.textureOut ?? `generated/terrain-textures/${terrainId}`;
const autotileOut = options.autotileOut ?? `generated/autotiles/${terrainId}`;
const maskDir = options.maskDir ?? process.env.PANTHEON_AUTOTILE_MASK_DIR ?? "masks";

if (!existsSync(maskDir)) {
  throw new Error(`Autotile mask directory not found: ${maskDir}`);
}

const texture = await generateOpenRouterImage({
  id: `${terrainId}-source-texture`,
  title: `${options.material} source texture`,
  prompt: buildTexturePrompt(options.material, options.texturePrompt, options.stylePrompt),
  imageModel,
  reasoningEffort,
});
const writtenTexture = await writeGeneratedImage(textureOut, texture);

if (!writtenTexture.filePath) {
  throw new Error(`Terrain texture generator did not write a texture for ${terrainId}.`);
}

const manifest = await runAutotileWorkflow({
  texturePath: writtenTexture.filePath,
  material: options.material,
  imageModel,
  reasoningEffort,
  maskDir,
  concurrency:
    options.concurrency ??
    Number.parseInt(process.env.PANTHEON_AUTOTILE_CONCURRENCY ?? "4", 10),
  outputDir: autotileOut,
});

console.log(
  JSON.stringify(
    {
      terrainId,
      texturePath: writtenTexture.filePath,
      autotileManifestPath: `${autotileOut}/autotile-manifest.json`,
      combinedAtlasPath: manifest.combinedAtlasPath,
    },
    null,
    2,
  ),
);

function buildTexturePrompt(
  material: string,
  texturePrompt: string,
  stylePrompt: string,
): string {
  return [
    `Create one seamless square terrain source texture for ${material}.`,
    "",
    `Texture brief: ${texturePrompt}.`,
    `Style direction: ${stylePrompt}.`,
    "",
    "This image will be used as the exact source texture for a 47-tile dual-grid autotile generator.",
    "Make a single flat top-down material swatch, not a tile sheet, not a map, and not a scene.",
    "The texture must be seamless or near-seamless on all four edges.",
    "Use consistent visual density across the entire square: repeated details must have the same size, spacing, and amount everywhere.",
    "Avoid large unique focal elements, landmarks, symbols, logos, text, UI, borders, frames, cast shadows, perspective objects, or lighting gradients.",
    "Keep the material readable when cropped into many 256px terrain tiles.",
    "Return one square PNG only.",
  ].join("\n");
}

function parseArgs(args: string[]): CliOptions {
  const parsed: CliOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    switch (arg) {
      case "--":
        break;
      case "--terrain-id":
        parsed.terrainId = readValue(arg, next);
        index += 1;
        break;
      case "--material":
      case "-m":
        parsed.material = readValue(arg, next);
        index += 1;
        break;
      case "--texture":
      case "--texture-prompt":
        parsed.texturePrompt = readValue(arg, next);
        index += 1;
        break;
      case "--style":
      case "--style-prompt":
        parsed.stylePrompt = readValue(arg, next);
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
      case "--mask-dir":
        parsed.maskDir = readValue(arg, next);
        index += 1;
        break;
      case "--concurrency":
        parsed.concurrency = Number.parseInt(readValue(arg, next), 10);
        index += 1;
        break;
      case "--texture-out":
        parsed.textureOut = readValue(arg, next);
        index += 1;
        break;
      case "--autotile-out":
      case "--out":
      case "-o":
        parsed.autotileOut = readValue(arg, next);
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
  console.log(`Generate a terrain source texture, then generate its 47-tile autotile atlas.

Usage:
  pnpm --filter @pantheon/assets generate-terrain-autotiles -- \\
    --terrain-id uniswap-v3-clover \\
    --material "Uniswap violet clover meadow" \\
    --texture "dense violet and mint clover, tiny pearl dew drops, subtle unicorn-pink flower sparks" \\
    --style "cozy hand-painted 2D game terrain, top-down, no logos, no text"

Options:
      --terrain-id <id>        Stable terrain id and default output folder name.
  -m, --material <name>        Material or biome terrain name.
      --texture <brief>        Source texture content prompt.
      --style <brief>          Source texture style prompt.
      --image-model <model>    OpenRouter image-capable model id.
      --reasoning-effort <n>   none, minimal, low, medium, high, xhigh. Default: high.
      --mask-dir <dir>         Directory containing autotile masks. Default: masks.
      --concurrency <n>        Parallel autotile mask requests, 1-5. Default: 4.
      --texture-out <dir>      Texture output directory. Default: generated/terrain-textures/<terrain-id>.
  -o, --out <dir>              Autotile output directory. Default: generated/autotiles/<terrain-id>.
  -h, --help                   Show this help.`);
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
