import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createStep, createWorkflow } from "@mastra/core/workflows";
import sharp from "sharp";
import { z } from "zod";

import { combineAutotileAtlas } from "./autotile-atlas.js";
import { writeAutotileManifest } from "./files.js";
import {
  autotileManifestSchema,
  autotileRequestSchema,
  autotileSegmentSchema,
  type GeneratedImage,
  type AutotileManifest,
  type AutotileRequest,
} from "./schemas.js";

type MaskDefinition = {
  id: "left-top" | "right-top-a" | "right-top-b" | "left-bottom" | "right-bottom";
  title: string;
  fileName: string;
  sourceGridSize: 3 | 4;
  gridOffsetColumn: number;
  gridOffsetRow: number;
  promptNotes?: string;
};

const maskDefinitions: MaskDefinition[] = [
  {
    id: "left-top",
    title: "Left Top autotile mask sheet",
    fileName: "Land Grid Map_Left Top.png",
    sourceGridSize: 4,
    gridOffsetColumn: 0,
    gridOffsetRow: 0,
  },
  {
    id: "right-top-a",
    title: "Right Top A autotile mask sheet",
    fileName: "Land Grid Map_Right Top A.png",
    sourceGridSize: 3,
    gridOffsetColumn: 1,
    gridOffsetRow: 0,
  },
  {
    id: "right-top-b",
    title: "Right Top B autotile mask sheet",
    fileName: "Land Grid Map_Right Top B.png",
    sourceGridSize: 3,
    gridOffsetColumn: 1,
    gridOffsetRow: 0,
  },
  {
    id: "left-bottom",
    title: "Left Bottom autotile mask sheet",
    fileName: "Land Grid Map_Left Bottom.png",
    sourceGridSize: 4,
    gridOffsetColumn: 0,
    gridOffsetRow: 0,
  },
  {
    id: "right-bottom",
    title: "Right Bottom autotile mask sheet",
    fileName: "Land Grid Map_Right Bottom.png",
    sourceGridSize: 3,
    gridOffsetColumn: 1,
    gridOffsetRow: 1,
  },
];

const autotileContextGridSize = 4;
const autotileContextTileSize = 256;
const autotileContextImageSize = autotileContextGridSize * autotileContextTileSize;
const centerVariantsFileName = "center-variants-4x4.png";
const generatedImageModel = "sharp-4x4-mask-composite";

type RawAlphaMask = {
  data: Buffer;
  width: number;
  height: number;
};

const autotileLoadedStateSchema = z.object({
  request: autotileRequestSchema,
  textureDataUrl: z.string(),
  textureReferencePath: z.string(),
  masks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      promptNotes: z.string().optional(),
      maskPath: z.string(),
      maskDataUrl: z.string(),
      maskReferencePath: z.string(),
    }),
  ),
});

const autotileGeneratedStateSchema = z.object({
  request: autotileRequestSchema,
  imageModel: z.string(),
  totalTiles: z.number().int(),
  combinedAtlasPath: z.string().optional(),
  segments: z.array(autotileSegmentSchema),
});

const loadAutotileInputsStep = createStep({
  id: "load-autotile-inputs",
  inputSchema: autotileRequestSchema,
  outputSchema: autotileLoadedStateSchema,
  execute: async ({ inputData }) => {
    logProgress(`Loading reference texture: ${inputData.texturePath}`);
    const textureReference = await createAutotileTextureReference(inputData.texturePath, inputData.outputDir);

    const selectedMasks = getSelectedMasks(inputData.maskIds);

    await assertMaskFilesExist(inputData.maskDir, selectedMasks);

    const masks = await Promise.all(
      selectedMasks.map(async (mask) => {
        const maskPath = path.join(inputData.maskDir, mask.fileName);
        logProgress(`Loading mask: ${maskPath}`);
        const maskReference = await createAutotileMaskReference(maskPath, inputData.outputDir, mask);

        return {
          id: mask.id,
          title: mask.title,
          promptNotes: mask.promptNotes,
          maskPath,
          maskDataUrl: maskReference.dataUrl,
          maskReferencePath: maskReference.filePath,
        };
      }),
    );

    return {
      request: inputData,
      textureDataUrl: textureReference.dataUrl,
      textureReferencePath: textureReference.filePath,
      masks,
    };
  },
});

const generateAutotileMasksStep = createStep({
  id: "composite-autotile-mask-sheets",
  inputSchema: autotileLoadedStateSchema,
  outputSchema: autotileGeneratedStateSchema,
  execute: async ({ inputData }) => {
    const segments = await mapWithConcurrency(inputData.masks, inputData.request.concurrency, async (mask, index) => {
      const prompt = buildCompositeDescription(inputData.request.material, mask.title, mask.promptNotes);
      logProgress(`Compositing mask sheet ${index + 1}/${inputData.masks.length}: ${mask.title}`);
      const writtenImage = await compositeAutotileMaskSheet({
        id: `autotile-${mask.id}`,
        title: mask.title,
        prompt,
        textureReferencePath: inputData.textureReferencePath,
        maskReferencePath: mask.maskReferencePath,
        outputDir: inputData.request.outputDir,
      });
      logProgress(`Wrote ${mask.id}: ${writtenImage.filePath}`);

      return {
        id: mask.id,
        title: mask.title,
        maskPath: mask.maskPath,
        prompt,
        image: writtenImage,
      };
    });

    return {
      request: inputData.request,
      imageModel: generatedImageModel,
      totalTiles: 47,
      segments,
    };
  },
});

const combineAutotileAtlasStep = createStep({
  id: "combine-autotile-atlas",
  inputSchema: autotileGeneratedStateSchema,
  outputSchema: autotileGeneratedStateSchema,
  execute: async ({ inputData }) => {
    const generatedMaskIds = new Set(inputData.segments.map((segment) => segment.id));
    const hasAllAtlasInputs = maskDefinitions.every((mask) => generatedMaskIds.has(mask.id));

    if (!hasAllAtlasInputs) {
      logProgress("Skipping combined autotile atlas because not all mask sheets were generated.");
      return inputData;
    }

    logProgress(`Combining generated mask sheets into 7x7 atlas in ${inputData.request.outputDir}.`);
    const combinedAtlasPath = await combineAutotileAtlas(inputData.request.outputDir);
    logProgress(`Wrote combined autotile atlas: ${combinedAtlasPath}`);

    return {
      ...inputData,
      combinedAtlasPath,
    };
  },
});

const writeAutotileManifestStep = createStep({
  id: "write-autotile-manifest",
  inputSchema: autotileGeneratedStateSchema,
  outputSchema: autotileManifestSchema,
  execute: async ({ inputData }) => {
    const manifest = {
      ...inputData,
      generatedAt: new Date().toISOString(),
    };

    logProgress(`Writing autotile manifest to ${inputData.request.outputDir}/autotile-manifest.json.`);
    await writeAutotileManifest(inputData.request.outputDir, manifest);

    return manifest;
  },
});

export const autotileWorkflow = createWorkflow({
  id: "dual-grid-autotile-mask-generator",
  inputSchema: autotileRequestSchema,
  outputSchema: autotileManifestSchema,
})
  .then(loadAutotileInputsStep)
  .then(generateAutotileMasksStep)
  .then(combineAutotileAtlasStep)
  .then(writeAutotileManifestStep)
  .commit();

export async function runAutotileWorkflow(request: AutotileRequest): Promise<AutotileManifest> {
  const run = await autotileWorkflow.createRun();
  const result = await run.start({
    inputData: autotileRequestSchema.parse(request),
  });

  if (result.status !== "success") {
    throw result.status === "failed" ? result.error : new Error("Autotile workflow suspended.");
  }

  return autotileManifestSchema.parse(result.result);
}

function buildCompositeDescription(material: string, maskTitle: string, promptNotes?: string): string {
  return [
    `Composite a deterministic 4x4 autotile mask sheet for ${maskTitle}.`,
    `Material/biome texture: ${material}.`,
    "The source texture is tiled into one 4x4 image, and the red mask regions are replaced directly with that same 4x4 texture image.",
    "No image model redraw or reinterpretation is used.",
    promptNotes ? `\nMask-specific layout constraints:\n${promptNotes}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

async function createAutotileTextureReference(
  texturePath: string,
  outputDir: string,
): Promise<{ filePath: string; dataUrl: string }> {
  const referenceDir = path.join(outputDir, "references");
  const filePath = path.join(referenceDir, "source-texture-4x4.png");
  const centerVariantsPath = path.join(outputDir, centerVariantsFileName);
  const tile = await sharp(texturePath)
    .resize(autotileContextTileSize, autotileContextTileSize, { fit: "fill" })
    .png()
    .toBuffer();

  const composites = [];
  for (let row = 0; row < autotileContextGridSize; row += 1) {
    for (let column = 0; column < autotileContextGridSize; column += 1) {
      composites.push({
        input: tile,
        left: column * autotileContextTileSize,
        top: row * autotileContextTileSize,
      });
    }
  }

  const output = await sharp({
    create: {
      width: autotileContextImageSize,
      height: autotileContextImageSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();

  await mkdir(referenceDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });
  await writeFile(filePath, output);
  await writeFile(centerVariantsPath, output);

  return {
    filePath,
    dataUrl: `data:image/png;base64,${output.toString("base64")}`,
  };
}

async function createAutotileMaskReference(
  maskPath: string,
  outputDir: string,
  mask: MaskDefinition,
): Promise<{ filePath: string; dataUrl: string }> {
  const referenceDir = path.join(outputDir, "references");
  const filePath = path.join(referenceDir, `mask-${mask.id}-4x4.png`);
  const resizedMask = await sharp(maskPath)
    .resize(mask.sourceGridSize * autotileContextTileSize, mask.sourceGridSize * autotileContextTileSize, {
      fit: "fill",
    })
    .png()
    .toBuffer();

  const output = await sharp({
    create: {
      width: autotileContextImageSize,
      height: autotileContextImageSize,
      channels: 4,
      background: { r: 184, g: 184, b: 184, alpha: 1 },
    },
  })
    .composite([
      {
        input: resizedMask,
        left: mask.gridOffsetColumn * autotileContextTileSize,
        top: mask.gridOffsetRow * autotileContextTileSize,
      },
    ])
    .png()
    .toBuffer();

  await mkdir(referenceDir, { recursive: true });
  await writeFile(filePath, output);

  return {
    filePath,
    dataUrl: `data:image/png;base64,${output.toString("base64")}`,
  };
}

async function compositeAutotileMaskSheet(args: {
  id: string;
  title: string;
  prompt: string;
  textureReferencePath: string;
  maskReferencePath: string;
  outputDir: string;
}): Promise<GeneratedImage> {
  const filePath = path.join(args.outputDir, `${args.id}.png`);
  const maskBase = await createMaskBackground(args.maskReferencePath);
  const redAlphaMask = await createRedAlphaMask(args.maskReferencePath);
  const maskedTexture = await createMaskedTexture(args.textureReferencePath, redAlphaMask);

  await mkdir(args.outputDir, { recursive: true });
  await sharp(maskBase)
    .composite([{ input: maskedTexture, left: 0, top: 0 }])
    .removeAlpha()
    .png()
    .toFile(filePath);

  return {
    id: args.id,
    title: args.title,
    prompt: args.prompt,
    model: generatedImageModel,
    contentType: "image/png",
    filePath,
  };
}

async function createMaskBackground(maskReferencePath: string): Promise<Buffer> {
  const { data, info } = await sharp(maskReferencePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let index = 0; index < data.length; index += info.channels) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const maskAlpha = getRedMaskAlpha(red, green, blue);

    if (maskAlpha <= 0) {
      continue;
    }

    const background = 184;
    data[index] = Math.round(red + (background - red) * maskAlpha);
    data[index + 1] = Math.round(green + (background - green) * maskAlpha);
    data[index + 2] = Math.round(blue + (background - blue) * maskAlpha);
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png()
    .toBuffer();
}

async function createRedAlphaMask(maskReferencePath: string): Promise<RawAlphaMask> {
  const { data, info } = await sharp(maskReferencePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alpha = Buffer.alloc(info.width * info.height);

  for (let sourceIndex = 0, targetIndex = 0; sourceIndex < data.length; sourceIndex += info.channels, targetIndex += 1) {
    const red = data[sourceIndex];
    const green = data[sourceIndex + 1];
    const blue = data[sourceIndex + 2];
    const sourceAlpha = data[sourceIndex + 3] / 255;
    alpha[targetIndex] = Math.round(getRedMaskAlpha(red, green, blue) * sourceAlpha * 255);
  }

  return {
    data: alpha,
    width: info.width,
    height: info.height,
  };
}

async function createMaskedTexture(textureReferencePath: string, alphaMask: RawAlphaMask): Promise<Buffer> {
  const { data, info } = await sharp(textureReferencePath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.width !== alphaMask.width || info.height !== alphaMask.height || info.channels !== 3) {
    throw new Error(
      `Texture reference and mask dimensions do not match: texture ${info.width}x${info.height}x${info.channels}, mask ${alphaMask.width}x${alphaMask.height}`,
    );
  }

  const rgba = Buffer.alloc(alphaMask.width * alphaMask.height * 4);
  for (
    let sourceIndex = 0, alphaIndex = 0, targetIndex = 0;
    sourceIndex < data.length;
    sourceIndex += info.channels, alphaIndex += 1, targetIndex += 4
  ) {
    rgba[targetIndex] = data[sourceIndex];
    rgba[targetIndex + 1] = data[sourceIndex + 1];
    rgba[targetIndex + 2] = data[sourceIndex + 2];
    rgba[targetIndex + 3] = alphaMask.data[alphaIndex];
  }

  return sharp(rgba, {
    raw: {
      width: alphaMask.width,
      height: alphaMask.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

function getRedMaskAlpha(red: number, green: number, blue: number): number {
  const dominance = red - Math.max(green, blue);
  if (red < 120 || dominance <= 24) {
    return 0;
  }

  return clamp((dominance - 24) / 96, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getSelectedMasks(maskIds: AutotileRequest["maskIds"]): MaskDefinition[] {
  if (!maskIds || maskIds.length === 0) {
    return maskDefinitions;
  }

  const selectedIds = new Set(maskIds);
  return maskDefinitions.filter((mask) => selectedIds.has(mask.id));
}

async function assertMaskFilesExist(maskDir: string, masks: MaskDefinition[]): Promise<void> {
  const files = new Set(await readdir(maskDir));
  const missingFiles = masks.map((mask) => mask.fileName).filter((fileName) => !files.has(fileName));

  if (missingFiles.length > 0) {
    throw new Error(`Missing autotile mask file(s) in ${maskDir}: ${missingFiles.join(", ")}`);
  }
}

async function mapWithConcurrency<TInput, TOutput>(
  values: TInput[],
  concurrency: number,
  mapper: (value: TInput, index: number) => Promise<TOutput>,
): Promise<TOutput[]> {
  const results = new Array<TOutput>(values.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(values[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => worker()));

  return results;
}

function logProgress(message: string): void {
  if (process.env.PANTHEON_ASSETS_LOG === "0") {
    return;
  }

  console.error(`[autotile] ${message}`);
}
