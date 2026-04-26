import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

import { readImageAsDataUrl, writeAutotileManifest, writeGeneratedImage } from "./files.js";
import { generateAutotilePlan, generateOpenRouterImage } from "./openrouter.js";
import {
  autotileManifestSchema,
  autotilePlanSchema,
  autotileRequestSchema,
  autotileSegmentSchema,
  type AutotileManifest,
  type AutotileRequest,
} from "./schemas.js";

type SegmentDefinition = {
  id: string;
  title: string;
  tileCount: number;
  columns: number;
  rows: number;
  details: string;
};

const autotilePlanStateSchema = z.object({
  request: autotileRequestSchema,
  referenceImageDataUrl: z.string(),
  plan: autotilePlanSchema,
});

const autotileGeneratedStateSchema = z.object({
  request: autotileRequestSchema,
  plan: autotilePlanSchema,
  imageModel: z.string(),
  textModel: z.string(),
  totalTiles: z.number().int(),
  segments: z.array(autotileSegmentSchema),
});

const segmentDefinitions: SegmentDefinition[] = [
  {
    id: "segment-01-basic-outer-edges-center",
    title: "Basic outer edges and center",
    tileCount: 9,
    columns: 3,
    rows: 3,
    details: [
      "Tile layout: 3 columns x 3 rows.",
      "Top row: top-left outer corner, top edge, top-right outer corner.",
      "Middle row: left edge, fully filled center, right edge.",
      "Bottom row: bottom-left outer corner, bottom edge, bottom-right outer corner.",
      "Outer corner tiles expose only their named two adjacent sides with chunky irregular transparent outer contours.",
      "Edge tiles expose only their named side with transparency outside that contour.",
      "The center tile is completely filled edge-to-edge with no transparency.",
      "All connected/shared inner sides must reach the exact tile boundary.",
    ].join("\n"),
  },
  {
    id: "segment-02-single-inner-corner-cutouts",
    title: "Single inner-corner cutouts",
    tileCount: 4,
    columns: 2,
    rows: 2,
    details: [
      "Tile layout: 2 columns x 2 rows.",
      "Top row: top-left inner-corner cutout, top-right inner-corner cutout.",
      "Bottom row: bottom-left inner-corner cutout, bottom-right inner-corner cutout.",
      "Each tile is mostly filled but has exactly one transparent concave organic bite in the named corner.",
      "These are inner cutout tiles, not outer edge tiles; do not expose a whole side.",
    ].join("\n"),
  },
  {
    id: "segment-03-adjacent-inner-corner-cutouts",
    title: "Two adjacent inner-corner cutouts",
    tileCount: 4,
    columns: 2,
    rows: 2,
    details: [
      "Tile layout: 2 columns x 2 rows.",
      "Top row: top-side double inner cutout, right-side double inner cutout.",
      "Bottom row: bottom-side double inner cutout, left-side double inner cutout.",
      "Each tile has two adjacent transparent concave corner bites.",
      "Keep the middle edge area between adjacent cutouts organically connected where appropriate; avoid straight geometric notches.",
      "Do not expose entire sides as outer edges.",
    ].join("\n"),
  },
  {
    id: "segment-04-opposite-inner-corner-cutouts",
    title: "Two opposite inner-corner cutouts",
    tileCount: 2,
    columns: 2,
    rows: 1,
    details: [
      "Tile layout: 2 columns x 1 row.",
      "Tile 1: transparent concave cutouts at top-left and bottom-right.",
      "Tile 2: transparent concave cutouts at top-right and bottom-left.",
      "The grass/material body must remain one continuous connected mass through the center.",
      "Do not split either tile into separate floating islands.",
    ].join("\n"),
  },
  {
    id: "segment-05-three-inner-corner-cutouts",
    title: "Three inner-corner cutouts",
    tileCount: 4,
    columns: 2,
    rows: 2,
    details: [
      "Tile layout: 2 columns x 2 rows.",
      "Top row: cutouts at top-left/top-right/bottom-left, then top-left/top-right/bottom-right.",
      "Bottom row: cutouts at top-left/bottom-left/bottom-right, then top-right/bottom-left/bottom-right.",
      "Each tile has exactly three transparent rounded organic corner bites.",
      "The remaining strongest corner must stay connected through the middle; avoid thin fragile strands.",
    ].join("\n"),
  },
  {
    id: "segment-06-four-inner-corner-cross",
    title: "Four inner-corner cutouts cross tile",
    tileCount: 1,
    columns: 1,
    rows: 1,
    details: [
      "Tile layout: 1 square tile.",
      "Add transparent concave organic cutouts at all four corners.",
      "The remaining material forms one chunky connected cross-like shape through the center.",
      "The shape reaches the middle portions of the top, right, bottom, and left tile edges.",
      "Do not create four separate patches or an isolated floating island.",
    ].join("\n"),
  },
  {
    id: "segment-07-outer-edge-plus-inner-cutout",
    title: "Outer edge plus one inner cutout",
    tileCount: 8,
    columns: 4,
    rows: 2,
    details: [
      "Tile layout: 4 columns x 2 rows.",
      "Top row: top exposed edge + bottom-left inner cutout; top exposed edge + bottom-right inner cutout; right exposed edge + top-left inner cutout; right exposed edge + bottom-left inner cutout.",
      "Bottom row: bottom exposed edge + top-left inner cutout; bottom exposed edge + top-right inner cutout; left exposed edge + top-right inner cutout; left exposed edge + bottom-right inner cutout.",
      "Each tile has exactly one exposed outer side and exactly one transparent concave inner-corner cutout.",
      "Do not expose any extra full side. Connected sides should still touch the tile boundary.",
    ].join("\n"),
  },
  {
    id: "segment-08-outer-corner-plus-inner-cutout",
    title: "Outer corner plus one inner cutout",
    tileCount: 8,
    columns: 4,
    rows: 2,
    details: [
      "Tile layout: 4 columns x 2 rows.",
      "Top row: top-left outer corner + bottom-right inner cutout; top-left outer corner + bottom-left inner cutout; top-right outer corner + bottom-left inner cutout; top-right outer corner + bottom-right inner cutout.",
      "Bottom row: bottom-left outer corner + top-right inner cutout; bottom-left outer corner + top-left inner cutout; bottom-right outer corner + top-left inner cutout; bottom-right outer corner + top-right inner cutout.",
      "Each tile has exactly two adjacent exposed sides forming one outer corner, plus exactly one additional transparent concave inner cutout.",
      "Do not add extra exposed sides; connected sides must reach the tile boundary.",
    ].join("\n"),
  },
  {
    id: "segment-09-strips-and-single-connections",
    title: "Thin strips and single-side connections",
    tileCount: 6,
    columns: 3,
    rows: 2,
    details: [
      "Tile layout: 3 columns x 2 rows.",
      "Top row: horizontal strip, vertical strip, single top connection.",
      "Bottom row: single right connection, single bottom connection, single left connection.",
      "Horizontal strip connects fully to left and right edges; top and bottom are exposed organic contours.",
      "Vertical strip connects fully to top and bottom edges; left and right are exposed organic contours.",
      "Single-connection tiles connect fully only to their named side; the other three sides are exposed organic contours.",
      "All strips and end caps should be chunky and material-rich, not thin geometric lines.",
    ].join("\n"),
  },
  {
    id: "segment-10-isolated-island",
    title: "Fully isolated single tile",
    tileCount: 1,
    columns: 1,
    rows: 1,
    details: [
      "Tile layout: 1 square tile.",
      "Create one standalone material island with all four sides exposed as chunky irregular organic contours.",
      "Transparency appears outside the entire silhouette.",
      "The patch should fill most of the square and must not be tiny or inset with excessive empty margins.",
    ].join("\n"),
  },
];

const planAutotileSetStep = createStep({
  id: "plan-autotile-set",
  inputSchema: autotileRequestSchema,
  outputSchema: autotilePlanStateSchema,
  execute: async ({ inputData }) => {
    logProgress(`Loading reference texture: ${inputData.texturePath}`);
    const referenceImageDataUrl = await readImageAsDataUrl(inputData.texturePath);

    logProgress(`Requesting autotile style plan from ${inputData.textModel}.`);
    const plan = await generateAutotilePlan({
      material: inputData.material,
      textModel: inputData.textModel,
      tileSize: inputData.tileSize,
    });

    return {
      request: inputData,
      referenceImageDataUrl,
      plan,
    };
  },
});

const generateAutotileSegmentsStep = createStep({
  id: "generate-autotile-segments",
  inputSchema: autotilePlanStateSchema,
  outputSchema: autotileGeneratedStateSchema,
  execute: async ({ inputData }) => {
    const generatedSegments = await mapWithConcurrency(
      segmentDefinitions,
      inputData.request.concurrency,
      async (segment, index) => {
        const prompt = buildSegmentPrompt(segment, inputData.request, inputData.plan);

        logProgress(`Generating segment ${index + 1}/${segmentDefinitions.length}: ${segment.title}`);

        const image = await generateOpenRouterImage({
          id: segment.id,
          title: segment.title,
          prompt,
          imageModel: inputData.request.imageModel,
          referenceImageDataUrl: inputData.referenceImageDataUrl,
        });

        const writtenImage = await writeGeneratedImage(inputData.request.outputDir, image);
        logProgress(`Wrote ${segment.id}: ${writtenImage.filePath}`);

        return {
          id: segment.id,
          title: segment.title,
          tileCount: segment.tileCount,
          columns: segment.columns,
          rows: segment.rows,
          prompt,
          image: writtenImage,
        };
      },
    );

    return {
      request: inputData.request,
      plan: inputData.plan,
      imageModel: inputData.request.imageModel,
      textModel: inputData.request.textModel,
      totalTiles: generatedSegments.reduce((sum, segment) => sum + segment.tileCount, 0),
      segments: generatedSegments,
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
  id: "dual-grid-autotile-generator",
  inputSchema: autotileRequestSchema,
  outputSchema: autotileManifestSchema,
})
  .then(planAutotileSetStep)
  .then(generateAutotileSegmentsStep)
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

function buildSegmentPrompt(segment: SegmentDefinition, request: AutotileRequest, plan: z.infer<typeof autotilePlanSchema>): string {
  return [
    `Create Segment ${segment.id.replace("segment-", "").slice(0, 2)} of a 47-tile dual-grid autotile set.`,
    "",
    "Use the provided reference texture image as the material source for every tile.",
    `Material/biome: ${request.material}.`,
    `Text-model art plan material name: ${plan.materialName}.`,
    `Visual style guide: ${plan.visualStyleGuide}`,
    `Consistency notes: ${plan.consistencyNotes.join(" ")}`,
    "",
    `The output must be a single transparent PNG containing exactly ${segment.tileCount} equal square tiles arranged in a perfect ${segment.columns}x${segment.rows} grid.`,
    `Each tile is intended to be ${request.tileSize}x${request.tileSize}px. The full sheet should preserve that grid ratio.`,
    "Tiles must be flush against each other with no spacing, no gutters, no padding, no visible divider lines, no borders, no outlines, no labels, and no frames.",
    "Each tile must occupy its full square cell. Connected sides must reach the exact tile boundary. Do not shrink material inward. Do not create floating patches unless the tile is explicitly the isolated island.",
    "The background must be fully transparent. Transparency is allowed only outside exposed silhouettes or inside specified concave inner cutouts.",
    "Exposed contours and inner cutouts must be chunky, rounded, irregular, organic, and natural for the provided material. Avoid straight geometric cuts.",
    "Maintain seamless texture continuity across connected edges whenever possible.",
    "",
    segment.details,
    "",
    `Important: output exactly ${segment.tileCount} tiles, no more and no less.`,
  ].join("\n");
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
