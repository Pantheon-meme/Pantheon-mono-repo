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
  imageModel: z.string().min(1),
  reasoningEffort: z
    .enum(["none", "minimal", "low", "medium", "high", "xhigh"])
    .default("high"),
  maskDir: z.string().default("masks"),
  maskIds: z
    .array(
      z.enum([
        "left-top",
        "right-top-a",
        "right-top-b",
        "left-bottom",
        "right-bottom",
      ]),
    )
    .optional(),
  outputDir: z.string().default("generated/autotiles"),
  concurrency: z.number().int().min(1).max(5).default(4),
});

export const autotileSegmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  maskPath: z.string(),
  prompt: z.string(),
  image: generatedImageSchema.optional(),
});

export const autotileManifestSchema = z.object({
  generatedAt: z.string(),
  request: autotileRequestSchema,
  imageModel: z.string(),
  totalTiles: z.number().int(),
  combinedAtlasPath: z.string().optional(),
  segments: z.array(autotileSegmentSchema),
});

export const objectSpriteStateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().optional(),
});

export const objectSpriteRequestSchema = z.object({
  spriteKind: z.enum(["object", "plant", "tree", "player"]).default("object"),
  objectId: z.string().min(1),
  objectName: z.string().min(1),
  objectPrompt: z.string().min(1),
  stylePrompt: z.string().min(1),
  styleReferencePath: z.string().optional(),
  styleReferenceCell: z
    .object({
      row: z.number().int().min(0),
      column: z.number().int().min(0),
      cellSize: z.number().int().min(1),
    })
    .optional(),
  imageModel: z.string().min(1),
  reasoningEffort: z
    .enum(["none", "minimal", "low", "medium", "high", "xhigh"])
    .default("high"),
  states: z.array(objectSpriteStateSchema).min(1),
  columns: z.number().int().min(1).max(12).default(4),
  columnLabels: z.array(z.string().min(1)).optional(),
  cellSize: z.number().int().min(16).max(512).default(128),
  background: z.enum(["transparent", "solid"]).default("transparent"),
  outputDir: z.string().default("generated/object-sprites"),
});

export const objectSpriteCellSchema = z.object({
  stateId: z.string(),
  stateTitle: z.string(),
  columnLabel: z.string(),
  row: z.number().int(),
  column: z.number().int(),
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int(),
  height: z.number().int(),
});

export const objectSpriteManifestSchema = z.object({
  generatedAt: z.string(),
  request: objectSpriteRequestSchema,
  imageModel: z.string(),
  rows: z.number().int(),
  columns: z.number().int(),
  cellSize: z.number().int(),
  atlasWidth: z.number().int(),
  atlasHeight: z.number().int(),
  image: generatedImageSchema,
  cells: z.array(objectSpriteCellSchema),
});

export type WorldAssetRequest = z.infer<typeof worldAssetRequestSchema>;
export type TextAsset = z.infer<typeof textAssetSchema>;
export type GeneratedImage = z.infer<typeof generatedImageSchema>;
export type WorldAssetManifest = z.infer<typeof worldAssetManifestSchema>;
export type AutotileRequest = z.infer<typeof autotileRequestSchema>;
export type AutotileSegment = z.infer<typeof autotileSegmentSchema>;
export type AutotileManifest = z.infer<typeof autotileManifestSchema>;
export type ObjectSpriteState = z.infer<typeof objectSpriteStateSchema>;
export type ObjectSpriteRequest = z.infer<typeof objectSpriteRequestSchema>;
export type ObjectSpriteManifest = z.infer<typeof objectSpriteManifestSchema>;
