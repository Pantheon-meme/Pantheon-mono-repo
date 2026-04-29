#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { loadEnvFile } from "node:process";

import { runAutotileWorkflow } from "./autotile-workflow.js";
import { writeGeneratedImage } from "./files.js";
import { generateOpenRouterImage } from "./openrouter.js";
import { uniswapRegionTerrainAssets } from "./biome-terrain-definitions.js";

type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

type CliOptions = {
  terrainId?: string;
  imageModel?: string;
  reasoningEffort?: ReasoningEffort;
  maskDir?: string;
  concurrency?: number;
  terrainConcurrency?: number;
  help?: boolean;
};

loadNearestEnvFile();

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  printHelp();
  process.exit(0);
}

const selectedTerrains = options.terrainId
  ? uniswapRegionTerrainAssets.filter((terrain) => terrain.id === options.terrainId)
  : uniswapRegionTerrainAssets;

if (selectedTerrains.length === 0) {
  throw new Error(`Unknown biome terrain id "${options.terrainId}".`);
}

await mapWithConcurrency(
  selectedTerrains,
  options.terrainConcurrency ??
    Number.parseInt(process.env.PANTHEON_BIOME_TERRAIN_CONCURRENCY ?? "3", 10),
  async (terrain) => {
  console.log(`[biome-terrain] Generating ${terrain.id}`);
  const imageModel =
    options.imageModel ??
    process.env.OPENROUTER_IMAGE_MODEL ??
    "google/gemini-2.5-flash-image";
  const reasoningEffort =
    options.reasoningEffort ??
    parseReasoningEffort(process.env.OPENROUTER_REASONING_EFFORT ?? "high");
  const maskDir =
    options.maskDir ?? process.env.PANTHEON_AUTOTILE_MASK_DIR ?? "masks";

  if (!existsSync(maskDir)) {
    throw new Error(`Autotile mask directory not found: ${maskDir}`);
  }

  const texture = await generateOpenRouterImage({
    id: `${terrain.id}-source-texture`,
    title: `${terrain.material} source texture`,
    prompt: buildTexturePrompt(terrain.material, terrain.texture),
    imageModel,
    reasoningEffort,
  });
  const writtenTexture = await writeGeneratedImage(
    `generated/terrain-textures/${terrain.id}`,
    texture,
  );

  if (!writtenTexture.filePath) {
    throw new Error(`Terrain texture generator did not write a texture for ${terrain.id}.`);
  }

  await runAutotileWorkflow({
    texturePath: writtenTexture.filePath,
    material: terrain.material,
    imageModel,
    reasoningEffort,
    maskDir,
    concurrency:
      options.concurrency ??
      Number.parseInt(process.env.PANTHEON_AUTOTILE_CONCURRENCY ?? "4", 10),
    outputDir: `generated/autotiles/${terrain.id}`,
  });
  },
);

function buildTexturePrompt(material: string, texture: string): string {
  return [
    `Create one seamless square terrain source texture for ${material}.`,
    "",
    `Texture brief: ${texture}.`,
    "Style direction: cozy hand-painted 2D game terrain, top-down, crisp dual-grid autotile readability, no logos, no text.",
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
      case "--terrain-concurrency":
        parsed.terrainConcurrency = Number.parseInt(readValue(arg, next), 10);
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
  const terrainIds = uniswapRegionTerrainAssets.map((terrain) => terrain.id).join(", ");

  console.log(`Generate Uniswap region-specific terrain autotiles.

Usage:
  pnpm --filter @pantheon/assets generate-biome-terrain-assets
  pnpm --filter @pantheon/assets generate-biome-terrain-assets -- --terrain-id oracle-fen-glass-mud

Options:
      --terrain-id <id>        Generate one terrain. Known ids: ${terrainIds}
      --image-model <model>    OpenRouter image-capable model id.
      --reasoning-effort <n>   none, minimal, low, medium, high, xhigh. Default: high.
      --mask-dir <dir>         Directory containing autotile masks. Default: masks.
      --concurrency <n>        Parallel autotile mask requests, 1-5. Default: 4.
      --terrain-concurrency <n>
                                Parallel terrain generations. Default: 3.
  -h, --help                   Show this help.`);
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  iteratee: (item: T) => Promise<void>,
): Promise<void> {
  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex];
        nextIndex += 1;

        await iteratee(item);
      }
    }),
  );
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
