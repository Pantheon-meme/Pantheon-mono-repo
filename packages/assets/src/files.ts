import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import type { AutotileManifest, GeneratedImage, ObjectSpriteManifest, WorldAssetManifest } from "./schemas.js";

const extensionByContentType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function writeManifest(outputDir: string, manifest: WorldAssetManifest): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const manifestPath = path.join(outputDir, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifestPath;
}

export async function writeAutotileManifest(outputDir: string, manifest: AutotileManifest): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const manifestPath = path.join(outputDir, "autotile-manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifestPath;
}

export async function writeObjectSpriteManifest(outputDir: string, manifest: ObjectSpriteManifest): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const manifestPath = path.join(outputDir, "object-sprite-manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifestPath;
}

export async function writeGeneratedImage(outputDir: string, image: GeneratedImage): Promise<GeneratedImage> {
  if (!image.dataUrl) {
    return image;
  }

  const base64Marker = ";base64,";
  const markerIndex = image.dataUrl.indexOf(base64Marker);

  if (markerIndex === -1) {
    throw new Error(`Image "${image.title}" did not return a base64 data URL.`);
  }

  const extension = extensionByContentType[image.contentType] ?? "bin";
  const fileName = `${slugify(image.id || image.title)}.${extension}`;
  const filePath = path.join(outputDir, fileName);
  const base64 = image.dataUrl.slice(markerIndex + base64Marker.length);

  await mkdir(outputDir, { recursive: true });
  await writeFile(filePath, Buffer.from(base64, "base64"));

  return {
    ...image,
    filePath,
    dataUrl: undefined,
  };
}

export async function readImageAsDataUrl(filePath: string): Promise<string> {
  const contentType = contentTypeFromExtension(path.extname(filePath));
  const data = await readFile(filePath);

  return `data:${contentType};base64,${data.toString("base64")}`;
}

export async function readImageCellAsDataUrl(args: {
  filePath: string;
  row: number;
  column: number;
  cellSize: number;
}): Promise<string> {
  const data = await sharp(args.filePath)
    .extract({
      left: args.column * args.cellSize,
      top: args.row * args.cellSize,
      width: args.cellSize,
      height: args.cellSize,
    })
    .png()
    .toBuffer();

  return `data:image/png;base64,${data.toString("base64")}`;
}

function contentTypeFromExtension(extension: string): string {
  switch (extension.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
