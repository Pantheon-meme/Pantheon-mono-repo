import { createStep, createWorkflow } from "@mastra/core/workflows";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";

import { readImageAsDataUrl, readImageCellAsDataUrl, writeGeneratedImage, writeObjectSpriteManifest } from "./files.js";
import { generateOpenRouterImage } from "./openrouter.js";
import {
  objectSpriteManifestSchema,
  objectSpriteRequestSchema,
  type ObjectSpriteManifest,
  type ObjectSpriteRequest,
} from "./schemas.js";

const objectSpriteLoadedStateSchema = z.object({
  request: objectSpriteRequestSchema,
  layoutGuideDataUrl: z.string(),
  layoutGuidePath: z.string(),
  styleReferenceDataUrl: z.string().optional(),
});

const objectSpriteGeneratedStateSchema = z.object({
  request: objectSpriteRequestSchema,
  imageModel: z.string(),
  image: z.object({
    id: z.string(),
    title: z.string(),
    prompt: z.string(),
    model: z.string(),
    contentType: z.string(),
    filePath: z.string().optional(),
    dataUrl: z.string().optional(),
  }),
});

const loadObjectSpriteInputsStep = createStep({
  id: "load-object-sprite-inputs",
  inputSchema: objectSpriteRequestSchema,
  outputSchema: objectSpriteLoadedStateSchema,
  execute: async ({ inputData }) => {
    const request = normalizeColumnLabels(inputData);
    const layoutGuide = await createLayoutGuide(request);
    const styleReferenceDataUrl = inputData.styleReferencePath
      ? inputData.styleReferenceCell
        ? await readImageCellAsDataUrl({
            filePath: inputData.styleReferencePath,
            ...inputData.styleReferenceCell,
          })
        : await readImageAsDataUrl(inputData.styleReferencePath)
      : undefined;

    if (inputData.styleReferencePath) {
      const cell = inputData.styleReferenceCell
        ? ` cell row ${inputData.styleReferenceCell.row}, column ${inputData.styleReferenceCell.column}`
        : "";
      logProgress(`Loaded style reference${cell}: ${inputData.styleReferencePath}`);
    }

    return {
      request,
      layoutGuideDataUrl: layoutGuide.dataUrl,
      layoutGuidePath: layoutGuide.filePath,
      styleReferenceDataUrl,
    };
  },
});

const generateObjectSpriteSheetStep = createStep({
  id: "generate-object-sprite-sheet",
  inputSchema: objectSpriteLoadedStateSchema,
  outputSchema: objectSpriteGeneratedStateSchema,
  execute: async ({ inputData }) => {
    const prompt = buildObjectSpritePrompt(
      inputData.request,
      inputData.layoutGuidePath,
      Boolean(inputData.styleReferenceDataUrl),
    );

    logProgress(
      `Generating ${inputData.request.objectName} sprite sheet: ${inputData.request.states.length} rows x ${inputData.request.columns} columns.`,
    );

    const image = await generateOpenRouterImage({
      id: `${inputData.request.objectId}-sprite-sheet`,
      title: `${inputData.request.objectName} sprite sheet`,
      prompt,
      imageModel: inputData.request.imageModel,
      reasoningEffort: inputData.request.reasoningEffort,
      referenceImageDataUrls: [
        inputData.layoutGuideDataUrl,
        ...(inputData.styleReferenceDataUrl ? [inputData.styleReferenceDataUrl] : []),
      ],
    });

    const writtenImage = await writeGeneratedImage(inputData.request.outputDir, image);
    logProgress(`Wrote sprite sheet: ${writtenImage.filePath ?? writtenImage.title}`);

    return {
      request: inputData.request,
      imageModel: inputData.request.imageModel,
      image: writtenImage,
    };
  },
});

const writeObjectSpriteManifestStep = createStep({
  id: "write-object-sprite-manifest",
  inputSchema: objectSpriteGeneratedStateSchema,
  outputSchema: objectSpriteManifestSchema,
  execute: async ({ inputData }) => {
    const rows = inputData.request.states.length;
    const columns = inputData.request.columns;
    const cellSize = inputData.request.cellSize;
    const manifest = {
      generatedAt: new Date().toISOString(),
      request: inputData.request,
      imageModel: inputData.imageModel,
      rows,
      columns,
      cellSize,
      atlasWidth: columns * cellSize,
      atlasHeight: rows * cellSize,
      image: inputData.image,
      cells: buildObjectSpriteCells(inputData.request),
    };

    logProgress(`Writing object sprite manifest to ${inputData.request.outputDir}/object-sprite-manifest.json.`);
    await writeObjectSpriteManifest(inputData.request.outputDir, manifest);

    return manifest;
  },
});

export const objectSpriteWorkflow = createWorkflow({
  id: "object-sprite-sheet-generator",
  inputSchema: objectSpriteRequestSchema,
  outputSchema: objectSpriteManifestSchema,
})
  .then(loadObjectSpriteInputsStep)
  .then(generateObjectSpriteSheetStep)
  .then(writeObjectSpriteManifestStep)
  .commit();

export async function runObjectSpriteWorkflow(request: ObjectSpriteRequest): Promise<ObjectSpriteManifest> {
  const run = await objectSpriteWorkflow.createRun();
  const result = await run.start({
    inputData: objectSpriteRequestSchema.parse(request),
  });

  if (result.status !== "success") {
    throw result.status === "failed" ? result.error : new Error("Object sprite workflow suspended.");
  }

  return objectSpriteManifestSchema.parse(result.result);
}

function buildObjectSpritePrompt(
  request: ObjectSpriteRequest,
  layoutGuidePath: string,
  hasStyleReference: boolean,
): string {
  const rows = request.states.length;
  const columns = request.columns;
  const width = columns * request.cellSize;
  const height = rows * request.cellSize;
  const columnLabels = getColumnLabels(request);

  return [
    `Create a game object sprite sheet for ${request.objectName}.`,
    `Object brief: ${request.objectPrompt}.`,
    "",
    "Reference image 1 is a checkerboard layout guide. Use it as the exact composition template.",
    `Preserve its ${columns}:${rows} sheet ratio and its ${columns} columns by ${rows} rows of equal square cells.`,
    `The exact guide has also been saved locally at ${layoutGuidePath} for verification.`,
    "Place exactly one frame in the center of each checkerboard cell.",
    "Align the center of each object frame to the center of its cell.",
    "Keep every frame fully inside its own cell, with consistent margins and no overlap into neighboring cells.",
    "Keep the checkerboard grid visible in the final image so the generated frames can be verified against the grid.",
    "Preserve the alternating white and gray cell backgrounds from the guide.",
    "Draw the object frames on top of the provided checkerboard cells.",
    "",
    `Target runtime atlas metadata: ${width}x${height} logical units, arranged as ${rows} rows by ${columns} columns.`,
    `Each logical grid cell is ${request.cellSize}x${request.cellSize} units. The generated image may be higher resolution, but it must keep the same ${columns}:${rows} grid ratio.`,
    "Keep the object scale, anchor point, perspective, and lighting consistent across cells.",
    "Do not crop any object. Leave enough breathing room inside each cell for animation motion.",
    "Do not draw labels, text, numbers, watermarks, decorative borders, or UI.",
    request.background === "transparent"
      ? "Use a transparent background for every cell."
      : "Use one flat solid background color consistently across the entire sheet.",
    "",
    "Rows, top to bottom:",
    ...request.states.map((state, row) =>
      `Row ${row}: ${state.title} (${state.id})${state.prompt ? ` - ${state.prompt}` : ""}`,
    ),
    "",
    "Columns, left to right:",
    ...columnLabels.map((label, column) => `Column ${column}: ${label}.`),
    "",
    "Animation/transition behavior:",
    "Within each row, columns should be coherent animation or transition frames for that same state, not different unrelated designs.",
    "Frame-to-frame changes should be readable but modest, suitable for looping or stepping through in a 2D game.",
    "Preserve the same silhouette language and materials across all states so the object clearly evolves from row to row.",
    "",
    "Style direction:",
    request.stylePrompt,
    hasStyleReference
      ? "Reference image 2 is a style reference. Use it for palette, rendering texture, edge softness, contrast, and game-art finish. Do not copy its subject unless it matches the object brief."
      : "No image reference is provided, so follow the text style direction carefully.",
    "",
    "Return one PNG containing the full sprite sheet only.",
  ].join("\n");
}

async function createLayoutGuide(request: ObjectSpriteRequest): Promise<{ dataUrl: string; filePath: string }> {
  const guideCellSize = 256;
  const width = request.columns * guideCellSize;
  const height = request.states.length * guideCellSize;
  const background = Array.from({ length: request.states.length }, (_, row) =>
    Array.from({ length: request.columns }, (_, column) => {
      const fill = (row + column) % 2 === 0 ? "#ffffff" : "#d8d8d8";
      return `<rect x="${column * guideCellSize}" y="${row * guideCellSize}" width="${guideCellSize}" height="${guideCellSize}" fill="${fill}" />`;
    }).join("\n"),
  ).join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${background}
</svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const filePath = path.join(request.outputDir, "object-sprite-layout-guide.png");

  await mkdir(request.outputDir, { recursive: true });
  await writeFile(filePath, png);
  logProgress(`Wrote layout guide: ${filePath}`);

  return {
    dataUrl: `data:image/png;base64,${png.toString("base64")}`,
    filePath,
  };
}

function buildObjectSpriteCells(request: ObjectSpriteRequest): ObjectSpriteManifest["cells"] {
  const columnLabels = getColumnLabels(request);

  return request.states.flatMap((state, row) =>
    columnLabels.map((columnLabel, column) => ({
      stateId: state.id,
      stateTitle: state.title,
      columnLabel,
      row,
      column,
      x: column * request.cellSize,
      y: row * request.cellSize,
      width: request.cellSize,
      height: request.cellSize,
    })),
  );
}

function normalizeColumnLabels(request: ObjectSpriteRequest): ObjectSpriteRequest {
  return {
    ...request,
    columnLabels: getColumnLabels(request),
  };
}

function getColumnLabels(request: ObjectSpriteRequest): string[] {
  if (request.columnLabels && request.columnLabels.length > 0) {
    return Array.from({ length: request.columns }, (_, index) => request.columnLabels?.[index] ?? `frame ${index + 1}`);
  }

  return Array.from({ length: request.columns }, (_, index) => `frame ${index + 1}`);
}

function logProgress(message: string): void {
  if (process.env.PANTHEON_ASSETS_LOG === "0") {
    return;
  }

  console.error(`[object-sprite] ${message}`);
}
