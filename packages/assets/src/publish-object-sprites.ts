import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { objectSpriteManifestSchema, type ObjectSpriteManifest } from "./schemas.js";

const currentFilePath = fileURLToPath(import.meta.url);
const packageRoot = path.resolve(path.dirname(currentFilePath), "..");
const repoRoot = path.resolve(packageRoot, "../..");
const generatedObjectSpriteRoot = path.join(packageRoot, "generated/object-sprites");
const gameObjectSpriteRoot = path.join(repoRoot, "apps/game/src/assets/object-sprites");
const generatedRegistryPath = path.join(gameObjectSpriteRoot, "ObjectSpriteAssets.ts");
const photoroomSegmentEndpoint = "https://sdk.photoroom.com/v1/segment";

loadNearestEnvFile();

type PublishedObjectSprite = {
  id: string;
  importName: string;
  imageFileName: string;
  manifest: ObjectSpriteAssetManifest;
};

async function publishObjectSprites(): Promise<void> {
  await assertDirectoryExists(generatedObjectSpriteRoot);

  const generatedEntries = await fs.readdir(generatedObjectSpriteRoot, {
    withFileTypes: true,
  });
  const publishedSprites: PublishedObjectSprite[] = [];
  const publishedObjectIds = new Set<string>();

  for (const entry of generatedEntries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const sourceDir = path.join(generatedObjectSpriteRoot, entry.name);
    const manifestPath = path.join(sourceDir, "object-sprite-manifest.json");
    const manifest = objectSpriteManifestSchema.parse(
      JSON.parse(await fs.readFile(manifestPath, "utf8")),
    );

    if (!manifest.image.filePath) {
      throw new Error(`Object sprite ${entry.name} manifest has no image.filePath.`);
    }

    const objectId = manifest.request.objectId;

    if (publishedObjectIds.has(objectId)) {
      console.warn(
        `[publish-object-sprites] Skipping duplicate object id "${objectId}" from ${path.relative(repoRoot, sourceDir)}.`,
      );
      continue;
    }

    const imageFileName = path.basename(manifest.image.filePath);
    const destinationDir = path.join(gameObjectSpriteRoot, objectId);
    const destinationImagePath = path.join(destinationDir, imageFileName);
    const destinationManifestPath = path.join(destinationDir, "object-sprite-manifest.json");

    await fs.mkdir(destinationDir, { recursive: true });
    const runtimeManifest = await writeRuntimeSpriteSheet(
      path.resolve(packageRoot, manifest.image.filePath),
      destinationImagePath,
      manifest,
    );
    await fs.copyFile(manifestPath, destinationManifestPath);

    publishedSprites.push({
      id: objectId,
      importName: toImportName(objectId),
      imageFileName,
      manifest: runtimeManifest,
    });
    publishedObjectIds.add(objectId);
  }

  if (publishedSprites.length === 0) {
    throw new Error(`No generated object sprite directories found in ${path.relative(repoRoot, generatedObjectSpriteRoot)}.`);
  }

  await fs.mkdir(gameObjectSpriteRoot, { recursive: true });
  await fs.writeFile(generatedRegistryPath, buildRegistryModule(publishedSprites), "utf8");

  console.log(`Published ${publishedSprites.length} object sprite asset(s):`);
  for (const sprite of publishedSprites) {
    console.log(`- apps/game/src/assets/object-sprites/${sprite.id}/${sprite.imageFileName}`);
  }
  console.log(`- ${path.relative(repoRoot, generatedRegistryPath)}`);
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

async function writeRuntimeSpriteSheet(
  sourcePath: string,
  destinationPath: string,
  manifest: ObjectSpriteManifest,
): Promise<ObjectSpriteAssetManifest> {
  const source = await fs.readFile(sourcePath);
  const output = await removeBackgroundWithPhotoroom(source, path.basename(sourcePath));
  const metadata = await sharp(output).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read background-removed image dimensions for ${sourcePath}.`);
  }

  await fs.writeFile(destinationPath, output);

  return toRuntimeManifest(manifest, metadata.width, metadata.height);
}

async function removeBackgroundWithPhotoroom(image: Buffer, fileName: string): Promise<Buffer> {
  const apiKey = process.env.PHOTOROOM_API_KEY;

  if (!apiKey) {
    throw new Error("Missing PHOTOROOM_API_KEY. Add it to .env or export it before publishing object sprites.");
  }

  const form = new FormData();
  const imageBytes = new Uint8Array(image);
  form.append("image_file", new Blob([imageBytes], { type: "image/png" }), fileName);
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
    throw new Error(`PhotoRoom background removal failed (${response.status}): ${body}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function buildRegistryModule(sprites: PublishedObjectSprite[]): string {
  const imports = sprites
    .map((sprite) => `import ${sprite.importName}Url from "./${sprite.id}/${sprite.imageFileName}?url";`)
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

  return `${name || "objectSprite"}Sprite`;
}

function loadNearestEnvFile(): void {
  const envPath = findNearestFile(".env", process.cwd());

  if (envPath) {
    loadEnvFile(envPath);
  }
}

function findNearestFile(fileName: string, startDir: string): string | undefined {
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
