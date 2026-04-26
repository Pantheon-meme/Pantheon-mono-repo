import { readdir } from "node:fs/promises";
import path from "node:path";

import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

import { readImageAsDataUrl, writeAutotileManifest, writeGeneratedImage } from "./files.js";
import { generateOpenRouterImage } from "./openrouter.js";
import {
  autotileManifestSchema,
  autotileRequestSchema,
  autotileSegmentSchema,
  type AutotileManifest,
  type AutotileRequest,
} from "./schemas.js";

type MaskDefinition = {
  id: "left-top" | "right-top-a" | "right-top-b" | "left-bottom" | "right-bottom";
  title: string;
  fileName: string;
  promptNotes?: string;
};

const maskDefinitions: MaskDefinition[] = [
  {
    id: "left-top",
    title: "Left Top autotile mask sheet",
    fileName: "Land Grid Map_Left Top.png",
  },
  {
    id: "right-top-a",
    title: "Right Top A autotile mask sheet",
    fileName: "Land Grid Map_Right Top A.png",
  },
  {
    id: "right-top-b",
    title: "Right Top B autotile mask sheet",
    fileName: "Land Grid Map_Right Top B.png",
  },
  {
    id: "left-bottom",
    title: "Left Bottom autotile mask sheet",
    fileName: "Land Grid Map_Left Bottom.png",
  },
  {
    id: "right-bottom",
    title: "Right Bottom autotile mask sheet",
    fileName: "Land Grid Map_Right Bottom.png",
  },
];

const autotileLoadedStateSchema = z.object({
  request: autotileRequestSchema,
  textureDataUrl: z.string(),
  masks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      promptNotes: z.string().optional(),
      maskPath: z.string(),
      maskDataUrl: z.string(),
    }),
  ),
});

const autotileGeneratedStateSchema = z.object({
  request: autotileRequestSchema,
  imageModel: z.string(),
  totalTiles: z.number().int(),
  segments: z.array(autotileSegmentSchema),
});

const loadAutotileInputsStep = createStep({
  id: "load-autotile-inputs",
  inputSchema: autotileRequestSchema,
  outputSchema: autotileLoadedStateSchema,
  execute: async ({ inputData }) => {
    logProgress(`Loading reference texture: ${inputData.texturePath}`);
    const textureDataUrl = await readImageAsDataUrl(inputData.texturePath);

    const selectedMasks = getSelectedMasks(inputData.maskIds);

    await assertMaskFilesExist(inputData.maskDir, selectedMasks);

    const masks = await Promise.all(
      selectedMasks.map(async (mask) => {
        const maskPath = path.join(inputData.maskDir, mask.fileName);
        logProgress(`Loading mask: ${maskPath}`);

        return {
          id: mask.id,
          title: mask.title,
          promptNotes: mask.promptNotes,
          maskPath,
          maskDataUrl: await readImageAsDataUrl(maskPath),
        };
      }),
    );

    return {
      request: inputData,
      textureDataUrl,
      masks,
    };
  },
});

const generateAutotileMasksStep = createStep({
  id: "generate-autotile-mask-sheets",
  inputSchema: autotileLoadedStateSchema,
  outputSchema: autotileGeneratedStateSchema,
  execute: async ({ inputData }) => {
    const segments = await mapWithConcurrency(inputData.masks, inputData.request.concurrency, async (mask, index) => {
        const prompt = buildMaskPrompt(inputData.request.material, mask.title, mask.promptNotes);

      logProgress(`Generating mask sheet ${index + 1}/${inputData.masks.length}: ${mask.title}`);

      const image = await generateOpenRouterImage({
        id: `autotile-${mask.id}`,
        title: mask.title,
        prompt,
        imageModel: inputData.request.imageModel,
        reasoningEffort: inputData.request.reasoningEffort,
        referenceImageDataUrls: [inputData.textureDataUrl, mask.maskDataUrl],
      });

      const writtenImage = await writeGeneratedImage(inputData.request.outputDir, image);
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
      imageModel: inputData.request.imageModel,
      totalTiles: 47,
      segments,
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

function buildMaskPrompt(material: string, maskTitle: string, promptNotes?: string): string {
  return [
    `Create a generated autotile mask sheet for ${maskTitle}.`,
    `Material/biome texture: ${material}.`,
    "",
    "You are given two reference images:",
    "1. The source texture image.",
    "2. A mask sheet containing red mask regions over a gray/white background.",
    "",
    "Use the red area as the main mask, but do not preserve its border as a perfectly hard vector edge.",
    "Replace the red with the provided texture and make the boundary texture-aware: slightly feather, erode, expand, and irregularize the edge using the material details so the border looks natural.",
    "Preserve the macro silhouette exactly, but allow small material-level deviations along the edge for blending.",
    "Keep the gray/white background unchanged except for minimal edge overlap from the texture.",
    "Every red mask region must be completely filled with the provided texture.",
    "Do not leave any red pixels, red tint, partially uncovered red areas, holes, gaps, or untextured islands inside the mask.",
    "The texture must cover the full interior of each red shape continuously, edge to edge, with no transparent or background-colored breaks inside the masked area.",
    "Only the outer boundary may be slightly feathered or irregularized; the mask interior must remain fully textured.",
    "",
    "Do not add labels, grid lines, outlines, frames, shadows, lighting effects, or decorative elements.",
    "Do not alter the sheet layout, canvas aspect ratio, tile positions, gray background, or white background areas.",
    "The output image must have exactly the same aspect ratio and canvas framing as the provided mask sheet.",
    "Do not crop, pad, stretch, resize, rotate, or recompose the mask sheet.",
    "Every mask-sheet corner and outer boundary must remain aligned exactly with the input mask image.",
    "Only transform the red masked regions into the supplied texture material.",
    promptNotes ? `\nMask-specific layout constraints:\n${promptNotes}` : undefined,
    "Return one PNG corresponding to this full mask sheet.",
  ]
    .filter(Boolean)
    .join("\n");
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
