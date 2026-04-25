import { z } from "zod";

export const worldAssetRequestSchema = z.object({
  worldPrompt: z.string().min(1),
  textModel: z.string().min(1),
  imageModel: z.string().min(1),
  assetCount: z.number().int().min(1).max(6).default(3),
  styleGuide: z.string().optional(),
  outputDir: z.string().default("generated/world-assets"),
});

export const textAssetSchema = z.object({
  worldName: z.string(),
  summary: z.string(),
  loreHooks: z.array(z.string()),
  races: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      visualNotes: z.string(),
    }),
  ),
  landmarks: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      gameplayUse: z.string(),
    }),
  ),
  items: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      rarity: z.string(),
    }),
  ),
  imagePrompts: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      prompt: z.string(),
    }),
  ),
});

export const generatedImageSchema = z.object({
  id: z.string(),
  title: z.string(),
  prompt: z.string(),
  model: z.string(),
  contentType: z.string(),
  filePath: z.string().optional(),
  dataUrl: z.string().optional(),
});

export const worldAssetManifestSchema = z.object({
  generatedAt: z.string(),
  request: worldAssetRequestSchema,
  textModel: z.string(),
  imageModel: z.string(),
  textAssets: textAssetSchema,
  images: z.array(generatedImageSchema),
});

export type WorldAssetRequest = z.infer<typeof worldAssetRequestSchema>;
export type TextAsset = z.infer<typeof textAssetSchema>;
export type GeneratedImage = z.infer<typeof generatedImageSchema>;
export type WorldAssetManifest = z.infer<typeof worldAssetManifestSchema>;
