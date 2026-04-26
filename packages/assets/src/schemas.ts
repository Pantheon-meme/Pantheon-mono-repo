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

export const autotileRequestSchema = z.object({
  texturePath: z.string().min(1),
  material: z.string().min(1).default("provided texture material"),
  textModel: z.string().min(1),
  imageModel: z.string().min(1),
  tileSize: z.number().int().min(16).max(1024).default(128),
  outputDir: z.string().default("generated/autotiles"),
  concurrency: z.number().int().min(1).max(10).default(10),
});

export const autotilePlanSchema = z.object({
  materialName: z.string(),
  visualStyleGuide: z.string(),
  consistencyNotes: z.array(z.string()),
});

export const autotileSegmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  tileCount: z.number().int(),
  columns: z.number().int(),
  rows: z.number().int(),
  prompt: z.string(),
  image: generatedImageSchema.optional(),
});

export const autotileManifestSchema = z.object({
  generatedAt: z.string(),
  request: autotileRequestSchema,
  plan: autotilePlanSchema,
  imageModel: z.string(),
  textModel: z.string(),
  totalTiles: z.number().int(),
  segments: z.array(autotileSegmentSchema),
});

export type WorldAssetRequest = z.infer<typeof worldAssetRequestSchema>;
export type TextAsset = z.infer<typeof textAssetSchema>;
export type GeneratedImage = z.infer<typeof generatedImageSchema>;
export type WorldAssetManifest = z.infer<typeof worldAssetManifestSchema>;
export type AutotileRequest = z.infer<typeof autotileRequestSchema>;
export type AutotilePlan = z.infer<typeof autotilePlanSchema>;
export type AutotileSegment = z.infer<typeof autotileSegmentSchema>;
export type AutotileManifest = z.infer<typeof autotileManifestSchema>;
