#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { loadEnvFile } from "node:process";

import { runAutotileWorkflow } from "./autotile-workflow.js";

type CliOptions = {
  texture?: string;
  material?: string;
  textModel?: string;
  imageModel?: string;
  tileSize?: number;
  concurrency?: number;
  out?: string;
  help?: boolean;
};

loadNearestEnvFile();

const options = parseArgs(process.argv.slice(2));

if (options.help || !options.texture) {
  printHelp();
  process.exit(options.help ? 0 : 1);
}

if (!existsSync(options.texture)) {
  throw new Error(`Texture image not found: ${options.texture}`);
}

const manifest = await runAutotileWorkflow({
  texturePath: options.texture,
  material: options.material ?? process.env.PANTHEON_AUTOTILE_MATERIAL ?? "provided texture material",
  textModel: options.textModel ?? process.env.OPENROUTER_TEXT_MODEL ?? "openai/gpt-4o-mini",
  imageModel: options.imageModel ?? process.env.OPENROUTER_IMAGE_MODEL ?? "google/gemini-2.5-flash-image",
  tileSize: options.tileSize ?? Number.parseInt(process.env.PANTHEON_AUTOTILE_TILE_SIZE ?? "128", 10),
  concurrency: options.concurrency ?? Number.parseInt(process.env.PANTHEON_AUTOTILE_CONCURRENCY ?? "10", 10),
  outputDir: options.out ?? "generated/autotiles",
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
      case "--texture":
      case "-t":
        parsed.texture = readValue(arg, next);
        index += 1;
        break;
      case "--material":
      case "-m":
        parsed.material = readValue(arg, next);
        index += 1;
        break;
      case "--text-model":
        parsed.textModel = readValue(arg, next);
        index += 1;
        break;
      case "--image-model":
        parsed.imageModel = readValue(arg, next);
        index += 1;
        break;
      case "--tile-size":
        parsed.tileSize = Number.parseInt(readValue(arg, next), 10);
        index += 1;
        break;
      case "--concurrency":
        parsed.concurrency = Number.parseInt(readValue(arg, next), 10);
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

function printHelp(): void {
  console.log(`Generate a 47-tile dual-grid autotile set with OpenRouter.

Usage:
  pnpm --filter @pantheon/assets generate-autotiles -- --texture "<image-path>" [options]

Options:
  -t, --texture <path>      Square reference texture image to use as the material.
  -m, --material <name>     Material or biome name, e.g. grass, dirt, snow.
      --text-model <model>  OpenRouter text model id for the style plan.
      --image-model <model> OpenRouter image-capable model id for segment sheets.
      --tile-size <number>  Intended square tile size in pixels. Default: 128.
      --concurrency <n>     Parallel image segment requests, 1-10. Default: 10.
  -o, --out <dir>           Output directory. Default: generated/autotiles.
  -h, --help                Show this help.`);
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
