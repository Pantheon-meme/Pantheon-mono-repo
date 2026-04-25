import { createStep, createWorkflow } from "@mastra/core/workflows";

import { writeGeneratedImage, writeManifest } from "./files.js";
import { generateOpenRouterImage, generateWorldTextAssets } from "./openrouter.js";
import {
  worldAssetManifestSchema,
  worldAssetRequestSchema,
  type GeneratedImage,
  type WorldAssetManifest,
  type WorldAssetRequest,
} from "./schemas.js";

const planWorldAssetsStep = createStep({
  id: "plan-world-assets",
  inputSchema: worldAssetRequestSchema,
  outputSchema: worldAssetManifestSchema.omit({ images: true }),
  execute: async ({ inputData }) => {
    logProgress(`Requesting text asset plan from ${inputData.textModel}.`);

    const textAssets = await generateWorldTextAssets({
      worldPrompt: inputData.worldPrompt,
      textModel: inputData.textModel,
      assetCount: inputData.assetCount,
      styleGuide: inputData.styleGuide,
    });

    logProgress(`Text asset plan returned ${textAssets.imagePrompts.length} image prompt(s).`);

    return {
      generatedAt: new Date().toISOString(),
      request: inputData,
      textModel: inputData.textModel,
      imageModel: inputData.imageModel,
      textAssets,
    };
  },
});

const generateImagesStep = createStep({
  id: "generate-world-images",
  inputSchema: worldAssetManifestSchema.omit({ images: true }),
  outputSchema: worldAssetManifestSchema,
  execute: async ({ inputData }) => {
    const images: GeneratedImage[] = [];

    for (const [index, imagePrompt] of inputData.textAssets.imagePrompts.entries()) {
      logProgress(
        `Generating image ${index + 1}/${inputData.textAssets.imagePrompts.length} with ${inputData.imageModel}: ${imagePrompt.title}`,
      );

      const image = await generateOpenRouterImage({
        id: imagePrompt.id,
        title: imagePrompt.title,
        prompt: imagePrompt.prompt,
        imageModel: inputData.imageModel,
      });

      const writtenImage = await writeGeneratedImage(inputData.request.outputDir, image);
      images.push(writtenImage);

      logProgress(`Wrote image ${index + 1}/${inputData.textAssets.imagePrompts.length}: ${writtenImage.filePath}`);
    }

    return {
      ...inputData,
      images,
    };
  },
});

const writeManifestStep = createStep({
  id: "write-world-asset-manifest",
  inputSchema: worldAssetManifestSchema,
  outputSchema: worldAssetManifestSchema,
  execute: async ({ inputData }) => {
    logProgress(`Writing manifest to ${inputData.request.outputDir}/manifest.json.`);

    await writeManifest(inputData.request.outputDir, inputData);
    return inputData;
  },
});

export const worldAssetWorkflow = createWorkflow({
  id: "world-asset-generator",
  inputSchema: worldAssetRequestSchema,
  outputSchema: worldAssetManifestSchema,
})
  .then(planWorldAssetsStep)
  .then(generateImagesStep)
  .then(writeManifestStep)
  .commit();

export async function runWorldAssetWorkflow(request: WorldAssetRequest): Promise<WorldAssetManifest> {
  const run = await worldAssetWorkflow.createRun();
  const result = await run.start({
    inputData: worldAssetRequestSchema.parse(request),
  });

  if (result.status !== "success") {
    throw result.status === "failed" ? result.error : new Error("World asset workflow suspended.");
  }

  return worldAssetManifestSchema.parse(result.result);
}

function logProgress(message: string): void {
  if (process.env.PANTHEON_ASSETS_LOG === "0") {
    return;
  }

  console.error(`[assets] ${message}`);
}
