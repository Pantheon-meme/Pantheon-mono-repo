import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  objectSpriteManifestSchema,
  type ObjectSpriteManifest,
} from "./schemas.js";

const currentFilePath = fileURLToPath(import.meta.url);
const packageRoot = path.resolve(path.dirname(currentFilePath), "..");
const repoRoot = path.resolve(packageRoot, "../..");
const generatedObjectSpriteRoot = path.join(
  packageRoot,
  "generated/object-sprites",
);
const gameObjectSpriteRoot = path.join(
  repoRoot,
  "apps/game/src/assets/object-sprites",
);
const generatedRegistryPath = path.join(
  gameObjectSpriteRoot,
  "ObjectSpriteAssets.ts",
);
const photoroomSegmentEndpoint = "https://sdk.photoroom.com/v1/segment";

loadNearestEnvFile();

type CliOptions = {
  objectId?: string;
  objectIds?: string[];
  help?: boolean;
};

type PublishedObjectSprite = {
  id: string;
  importName: string;
  imageFileName: string;
  manifest: ObjectSpriteAssetManifest;
};

async function publishObjectSprites(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  await assertDirectoryExists(generatedObjectSpriteRoot);

  const generatedEntries = await fs.readdir(generatedObjectSpriteRoot, {
    withFileTypes: true,
  });
  const publishedObjectIds = new Set<string>();
  const selectedObjectIds = options.objectIds?.length
    ? new Set(options.objectIds)
    : options.objectId
      ? new Set([options.objectId])
      : undefined;
  const publishedNow: PublishedObjectSprite[] = [];

  for (const entry of generatedEntries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const sourceDir = path.join(generatedObjectSpriteRoot, entry.name);
    const manifestPath = path.join(sourceDir, "object-sprite-manifest.json");

    if (!(await pathExists(manifestPath))) {
      continue;
    }

    const manifest = objectSpriteManifestSchema.parse(
      JSON.parse(await fs.readFile(manifestPath, "utf8")),
    );

    if (!manifest.image.filePath) {
      throw new Error(
        `Object sprite ${entry.name} manifest has no image.filePath.`,
      );
    }

    const objectId = manifest.request.objectId;

    if (selectedObjectIds && !selectedObjectIds.has(objectId)) {
      continue;
    }

    if (publishedObjectIds.has(objectId)) {
      console.warn(
        `[publish-object-sprites] Skipping duplicate object id "${objectId}" from ${path.relative(repoRoot, sourceDir)}.`,
      );
      continue;
    }

    const imageFileName = path.basename(manifest.image.filePath);
    const destinationDir = path.join(gameObjectSpriteRoot, objectId);
    const destinationImagePath = path.join(destinationDir, imageFileName);
    const destinationManifestPath = path.join(
      destinationDir,
      "object-sprite-manifest.json",
    );

    await fs.mkdir(destinationDir, { recursive: true });
    const runtimeManifest = await writeRuntimeSpriteSheet(
      path.resolve(packageRoot, manifest.image.filePath),
      destinationImagePath,
      manifest,
    );
    await fs.copyFile(manifestPath, destinationManifestPath);

    publishedNow.push({
      id: objectId,
      importName: toImportName(objectId),
      imageFileName,
      manifest: runtimeManifest,
    });
    publishedObjectIds.add(objectId);
  }

  if (selectedObjectIds && publishedNow.length === 0) {
    throw new Error(
      `No generated object sprite found for ${formatSelectedObjectIds(selectedObjectIds)}.`,
    );
  }

  if (!selectedObjectIds && publishedNow.length === 0) {
    throw new Error(
      `No generated object sprite directories found in ${path.relative(repoRoot, generatedObjectSpriteRoot)}.`,
    );
  }

  await fs.mkdir(gameObjectSpriteRoot, { recursive: true });
  const publishedSprites = await readPublishedObjectSprites();

  await fs.writeFile(
    generatedRegistryPath,
    buildRegistryModule(publishedSprites),
    "utf8",
  );

  console.log(`Published ${publishedNow.length} object sprite asset(s):`);
  for (const sprite of publishedNow) {
    console.log(
      `- apps/game/src/assets/object-sprites/${sprite.id}/${sprite.imageFileName}`,
    );
  }
  console.log(
    `Rebuilt registry with ${publishedSprites.length} object sprite asset(s).`,
  );
  console.log(`- ${path.relative(repoRoot, generatedRegistryPath)}`);
}

async function readPublishedObjectSprites(): Promise<PublishedObjectSprite[]> {
  const entries = await fs.readdir(gameObjectSpriteRoot, {
    withFileTypes: true,
  });
  const sprites: PublishedObjectSprite[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) {
      continue;
    }

    const sourceDir = path.join(gameObjectSpriteRoot, entry.name);
    const manifestPath = path.join(sourceDir, "object-sprite-manifest.json");

    if (!(await pathExists(manifestPath))) {
      continue;
    }

    const manifest = objectSpriteManifestSchema.parse(
      JSON.parse(await fs.readFile(manifestPath, "utf8")),
    );

    if (!manifest.image.filePath) {
      continue;
    }

    const imageFileName = path.basename(manifest.image.filePath);
    const imagePath = path.join(sourceDir, imageFileName);
    const metadata = await sharp(imagePath).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error(
        `Could not read published image dimensions for ${imagePath}.`,
      );
    }

    sprites.push({
      id: manifest.request.objectId,
      importName: toImportName(manifest.request.objectId),
      imageFileName,
      manifest: toRuntimeManifest(manifest, metadata.width, metadata.height),
    });
  }

  return sprites;
}

async function assertDirectoryExists(directoryPath: string): Promise<void> {
  try {
    const stats = await fs.stat(directoryPath);
    if (stats.isDirectory()) {
      return;
    }
  } catch {
    // The error below includes the expected generator output location.
  }

  throw new Error(
    `Missing generated object sprite directory: ${path.relative(
      repoRoot,
      directoryPath,
    )}. Run generate-object-sprites before publishing.`,
  );
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);

    return true;
  } catch {
    return false;
  }
}

async function writeRuntimeSpriteSheet(
  sourcePath: string,
  destinationPath: string,
  manifest: ObjectSpriteManifest,
): Promise<ObjectSpriteAssetManifest> {
  const source = await fs.readFile(sourcePath);
  const output = await removeBackground(
    source,
    path.basename(sourcePath),
    manifest,
  );
  const metadata = await sharp(output).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(
      `Could not read background-removed image dimensions for ${sourcePath}.`,
    );
  }

  await fs.writeFile(destinationPath, output);

  return toRuntimeManifest(manifest, metadata.width, metadata.height);
}

async function removeBackground(
  image: Buffer,
  fileName: string,
  manifest: ObjectSpriteManifest,
): Promise<Buffer> {
  if (process.env.PHOTOROOM_API_KEY) {
    return removeBackgroundWithPhotoroom(image, fileName);
  }

  console.warn(
    `[publish-object-sprites] PHOTOROOM_API_KEY is not set; using local checkerboard background removal for ${fileName}.`,
  );

  return removeCheckerboardBackground(image, manifest);
}

async function removeBackgroundWithPhotoroom(
  image: Buffer,
  fileName: string,
): Promise<Buffer> {
  const apiKey = process.env.PHOTOROOM_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing PHOTOROOM_API_KEY. Add it to .env or export it before publishing object sprites.",
    );
  }

  const form = new FormData();
  const imageBytes = new Uint8Array(image);
  form.append(
    "image_file",
    new Blob([imageBytes], { type: "image/png" }),
    fileName,
  );
  form.append("format", "png");
  form.append("channels", "rgba");
  form.append("size", "full");

  const response = await fetch(photoroomSegmentEndpoint, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
    },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `PhotoRoom background removal failed (${response.status}): ${body}`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

async function removeCheckerboardBackground(
  image: Buffer,
  manifest: ObjectSpriteManifest,
): Promise<Buffer> {
  const input = sharp(image).ensureAlpha();
  const metadata = await input.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Could not read generated sprite sheet dimensions.");
  }

  const width = metadata.width;
  const height = metadata.height;
  const pixels = Buffer.from(await input.raw().toBuffer());
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  const cellWidth = width / manifest.columns;
  const cellHeight = height / manifest.rows;

  for (let row = 0; row < manifest.rows; row += 1) {
    for (let column = 0; column < manifest.columns; column += 1) {
      const left = Math.floor(column * cellWidth);
      const right = Math.min(
        width - 1,
        Math.ceil((column + 1) * cellWidth) - 1,
      );
      const top = Math.floor(row * cellHeight);
      const bottom = Math.min(
        height - 1,
        Math.ceil((row + 1) * cellHeight) - 1,
      );

      enqueueBackgroundSeed(left, top, width, pixels, visited, queue);
      enqueueBackgroundSeed(right, top, width, pixels, visited, queue);
      enqueueBackgroundSeed(left, bottom, width, pixels, visited, queue);
      enqueueBackgroundSeed(right, bottom, width, pixels, visited, queue);
    }
  }

  while (queue.length > 0) {
    const index = queue.pop();

    if (index === undefined) {
      continue;
    }

    const x = index % width;
    const y = Math.floor(index / width);

    pixels[index * 4 + 3] = 0;

    enqueueBackgroundNeighbor(x - 1, y, width, height, pixels, visited, queue);
    enqueueBackgroundNeighbor(x + 1, y, width, height, pixels, visited, queue);
    enqueueBackgroundNeighbor(x, y - 1, width, height, pixels, visited, queue);
    enqueueBackgroundNeighbor(x, y + 1, width, height, pixels, visited, queue);
  }

  return sharp(pixels, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();
}

function enqueueBackgroundSeed(
  x: number,
  y: number,
  width: number,
  pixels: Buffer,
  visited: Uint8Array,
  queue: number[],
): void {
  const index = y * width + x;

  if (visited[index] || !isCheckerboardBackground(pixels, index)) {
    return;
  }

  visited[index] = 1;
  queue.push(index);
}

function enqueueBackgroundNeighbor(
  x: number,
  y: number,
  width: number,
  height: number,
  pixels: Buffer,
  visited: Uint8Array,
  queue: number[],
): void {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return;
  }

  enqueueBackgroundSeed(x, y, width, pixels, visited, queue);
}

function isCheckerboardBackground(pixels: Buffer, pixelIndex: number): boolean {
  const offset = pixelIndex * 4;
  const red = pixels[offset];
  const green = pixels[offset + 1];
  const blue = pixels[offset + 2];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);

  return max - min <= 30 && max >= 145;
}

function buildRegistryModule(sprites: PublishedObjectSprite[]): string {
  const imports = sprites
    .map(
      (sprite) =>
        `import ${sprite.importName}Url from "./${sprite.id}/${sprite.imageFileName}?url";`,
    )
    .join("\n");
  const entries = sprites
    .map(
      (sprite) => `  ${JSON.stringify(sprite.id)}: {
    imageUrl: ${sprite.importName}Url,
    manifest: ${JSON.stringify(sprite.manifest, null, 4)
      .split("\n")
      .join("\n    ")},
  },`,
    )
    .join("\n");

  return `${imports}

export type ObjectSpriteCell = {
  stateId: string;
  stateTitle: string;
  columnLabel: string;
  row: number;
  column: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ObjectSpriteAsset = {
  imageUrl: string;
  manifest: {
    rows: number;
    columns: number;
    cellSize: number;
    atlasWidth: number;
    atlasHeight: number;
    cells: ObjectSpriteCell[];
  };
};

export const objectSpriteAssets = {
${entries}
} satisfies Record<string, ObjectSpriteAsset>;
`;
}

function toRuntimeManifest(
  manifest: ObjectSpriteManifest,
  atlasWidth: number,
  atlasHeight: number,
): ObjectSpriteAssetManifest {
  const scaleX = atlasWidth / manifest.atlasWidth;
  const scaleY = atlasHeight / manifest.atlasHeight;
  const cellWidth = atlasWidth / manifest.columns;
  const cellHeight = atlasHeight / manifest.rows;

  if (!Number.isInteger(cellWidth) || !Number.isInteger(cellHeight)) {
    throw new Error(
      `Generated object sprite ${manifest.request.objectId} image dimensions ${atlasWidth}x${atlasHeight} are not evenly divisible by ${manifest.columns}x${manifest.rows}.`,
    );
  }

  if (cellWidth !== cellHeight) {
    throw new Error(
      `Generated object sprite ${manifest.request.objectId} has non-square cells: ${cellWidth}x${cellHeight}.`,
    );
  }

  return {
    rows: manifest.rows,
    columns: manifest.columns,
    cellSize: cellWidth,
    atlasWidth,
    atlasHeight,
    cells: manifest.cells.map((cell) => ({
      ...cell,
      x: Math.round(cell.x * scaleX),
      y: Math.round(cell.y * scaleY),
      width: Math.round(cell.width * scaleX),
      height: Math.round(cell.height * scaleY),
    })),
  };
}

type ObjectSpriteAssetManifest = {
  rows: number;
  columns: number;
  cellSize: number;
  atlasWidth: number;
  atlasHeight: number;
  cells: ObjectSpriteManifest["cells"];
};

function toImportName(value: string): string {
  const words = value.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const name = words
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`,
    )
    .join("");

  const safeName = /^[A-Za-z_$]/.test(name) ? name : `asset${capitalize(name)}`;

  return `${safeName || "objectSprite"}Sprite`;
}

function capitalize(value: string): string {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

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
      case "--object-ids":
        parsed.objectIds = readValue(arg, next)
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
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

function formatSelectedObjectIds(objectIds: Set<string>): string {
  return [...objectIds].join(", ");
}

function readValue(flag: string, value: string | undefined): string {
  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for ${flag}.`);
  }

  return value.trim();
}

function printHelp(): void {
  console.log(`Publish generated object sprite sheets into the game asset registry.

Usage:
  pnpm --filter @pantheon/assets publish-object-sprites
  pnpm --filter @pantheon/assets publish-object-sprites -- --object-id uniswap-nature-props
  pnpm --filter @pantheon/assets publish-object-sprites -- --object-ids uniswap-nature-props,uniswap-lake-props

Options:
      --object-id <id>   Publish only one generated object id, preserving the rest of the registry.
      --object-ids <ids> Publish a comma-separated list of generated object ids.
  -h, --help           Show this help.`);
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
  const rootDir = path.parse(startDir).root;

  while (true) {
    const candidate = path.join(currentDir, fileName);

    if (existsSync(candidate)) {
      return candidate;
    }

    if (currentDir === rootDir) {
      return undefined;
    }

    currentDir = path.dirname(currentDir);
  }
}

publishObjectSprites().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[publish-object-sprites] ${message}`);
  process.exitCode = 1;
});
