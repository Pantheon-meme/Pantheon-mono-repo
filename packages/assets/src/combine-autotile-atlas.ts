import path from "node:path";

import { combineAutotileAtlas, combinedAutotileAtlasFileName } from "./autotile-atlas.js";

type Options = {
  inputDir: string;
  output: string;
};

const options = parseArgs(process.argv.slice(2));
const outputPath = await combineAutotileAtlas(options.inputDir, options.output);

console.log(`Wrote combined autotile atlas: ${outputPath}`);

function parseArgs(args: string[]): Options {
  const parsed: Partial<Options> = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    switch (arg) {
      case "--input-dir":
        parsed.inputDir = readValue(arg, next);
        index += 1;
        break;
      case "-o":
      case "--output":
        parsed.output = readValue(arg, next);
        index += 1;
        break;
      case "-h":
      case "--help":
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  const inputDir = parsed.inputDir ?? "generated/autotiles/dirt";

  return {
    inputDir,
    output: parsed.output ?? path.join(inputDir, combinedAutotileAtlasFileName),
  };
}

function readValue(flag: string, value?: string): string {
  if (!value || value.startsWith("-")) {
    throw new Error(`Expected a value after ${flag}`);
  }

  return value;
}

function printHelp(): void {
  console.log(`Combine generated autotile sheets into a 7x7 intermediate atlas.

Usage:
  pnpm --filter @pantheon/assets combine-autotile-atlas -- [options]

Options:
      --input-dir <dir>   Directory containing generated autotile PNGs. Default: generated/autotiles/dirt.
  -o, --output <path>     Output PNG path. Default: <input-dir>/${combinedAutotileAtlasFileName}.

Current layout:
  - left-top: 4x4, copied to output columns 1-4 and rows 1-4.
  - right-top-a: 3x3, copied to output columns 5-7 and rows 1-3.
  - right-top-b: 3x3, center row only, copied to output columns 5-7 and row 4.
  - left-bottom: 4x4, last row dropped, copied to output columns 1-4 and rows 5-7.
  - right-bottom: 3x3, copied to output columns 5-7 and rows 5-7.
`);
}
