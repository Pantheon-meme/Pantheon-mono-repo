#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { loadEnvFile } from "node:process";

import { runWorldAssetWorkflow } from "./workflow.js";

type CliOptions = {
  world?: string;
  textModel?: string;
  imageModel?: string;
  assetCount?: number;
  styleGuide?: string;
  out?: string;
  help?: boolean;
};

loadNearestEnvFile();

const options = parseArgs(process.argv.slice(2));

if (options.help || !options.world) {
  printHelp();
  process.exit(options.help ? 0 : 1);
}

const manifest = await runWorldAssetWorkflow({
  worldPrompt: options.world,
  textModel: options.textModel ?? process.env.OPENROUTER_TEXT_MODEL ?? "openai/gpt-4o-mini",
  imageModel: options.imageModel ?? process.env.OPENROUTER_IMAGE_MODEL ?? "google/gemini-2.5-flash-image",
  assetCount: options.assetCount ?? 3,
  styleGuide: options.styleGuide,
  outputDir: options.out ?? "generated/world-assets",
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
      case "--world":
      case "-w":
        parsed.world = readValue(arg, next);
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
      case "--count":
        parsed.assetCount = Number.parseInt(readValue(arg, next), 10);
        index += 1;
        break;
      case "--style":
        parsed.styleGuide = readValue(arg, next);
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

  return value;
}

function printHelp(): void {
  console.log(`Generate Pantheon world assets with Mastra and OpenRouter.

Usage:
  pnpm --filter @pantheon/assets generate -- --world "<brief>" [options]

Options:
  -w, --world <brief>       World brief to generate assets for.
      --text-model <model>  OpenRouter text model id.
      --image-model <model> OpenRouter image-capable model id.
      --count <number>      Number of image prompts to create, 1-6. Default: 3.
      --style <guide>       Optional visual/style guide.
  -o, --out <dir>           Output directory. Default: generated/world-assets.
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
