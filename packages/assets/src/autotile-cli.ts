#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { loadEnvFile } from "node:process";

import { runAutotileWorkflow } from "./autotile-workflow.js";

type CliOptions = {
  texture?: string;
  material?: string;
  imageModel?: string;
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
  maskDir?: string;
  maskIds?: Array<"left-top" | "right-top-a" | "right-top-b" | "left-bottom" | "right-bottom">;
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

const maskDir = options.maskDir ?? process.env.PANTHEON_AUTOTILE_MASK_DIR ?? "masks";

if (!existsSync(maskDir)) {
  throw new Error(`Autotile mask directory not found: ${maskDir}`);
}

const manifest = await runAutotileWorkflow({
  texturePath: options.texture,
  material: options.material ?? process.env.PANTHEON_AUTOTILE_MATERIAL ?? "provided texture material",
  imageModel: options.imageModel ?? process.env.OPENROUTER_IMAGE_MODEL ?? "google/gemini-2.5-flash-image",
  reasoningEffort: options.reasoningEffort ?? parseReasoningEffort(process.env.OPENROUTER_REASONING_EFFORT ?? "high"),
  maskDir,
  maskIds: options.maskIds,
  concurrency: options.concurrency ?? Number.parseInt(process.env.PANTHEON_AUTOTILE_CONCURRENCY ?? "4", 10),
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
      case "--mask":
        parsed.maskIds = [...(parsed.maskIds ?? []), parseMaskId(readValue(arg, next))];
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
  console.log(`Generate a 47-tile dual-grid autotile set from mask sheets with OpenRouter.

Usage:
  pnpm --filter @pantheon/assets generate-autotiles -- --texture "<image-path>" [options]

Options:
  -t, --texture <path>      Square reference texture image to use as the material.
  -m, --material <name>     Material or biome name, e.g. grass, dirt, snow.
      --image-model <model> OpenRouter image-capable model id for mask sheets.
      --reasoning-effort <level>
                             Reasoning effort: none, minimal, low, medium, high, xhigh. Default: high.
      --mask-dir <dir>      Directory containing the autotile mask PNGs. Default: masks.
      --mask <id>           Generate only one mask: left-top, right-top-a, right-top-b, left-bottom, right-bottom.
                             Can be provided more than once.
      --concurrency <n>     Parallel image mask requests, 1-5. Default: 4.
  -o, --out <dir>           Output directory. Default: generated/autotiles.
  -h, --help                Show this help.`);
}

function parseMaskId(value: string): "left-top" | "right-top-a" | "right-top-b" | "left-bottom" | "right-bottom" {
  const maskId = value.trim();

  switch (maskId) {
    case "left-top":
    case "right-top-a":
    case "right-top-b":
    case "left-bottom":
    case "right-bottom":
      return maskId;
    default:
      throw new Error(`Invalid mask id: ${value}`);
  }
}

function parseReasoningEffort(value: string): "none" | "minimal" | "low" | "medium" | "high" | "xhigh" {
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
