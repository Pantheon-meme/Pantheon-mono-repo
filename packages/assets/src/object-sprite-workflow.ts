import { createStep, createWorkflow } from "@mastra/core/workflows";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";

import {
  readImageAsDataUrl,
  readImageCellAsDataUrl,
  writeGeneratedImage,
  writeObjectSpriteManifest,
} from "./files.js";
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
      logProgress(
        `Loaded style reference${cell}: ${inputData.styleReferencePath}`,
      );
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
        ...(inputData.styleReferenceDataUrl
          ? [inputData.styleReferenceDataUrl]
          : []),
      ],
    });

    const writtenImage = await writeGeneratedImage(
      inputData.request.outputDir,
      image,
    );
    logProgress(
      `Wrote sprite sheet: ${writtenImage.filePath ?? writtenImage.title}`,
    );

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

    logProgress(
      `Writing object sprite manifest to ${inputData.request.outputDir}/object-sprite-manifest.json.`,
    );
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

export async function runObjectSpriteWorkflow(
  request: ObjectSpriteRequest,
): Promise<ObjectSpriteManifest> {
  const parsedRequest = objectSpriteRequestSchema.parse(request);

  const run = await objectSpriteWorkflow.createRun();
  const result = await run.start({
    inputData: parsedRequest,
  });

  if (result.status !== "success") {
    throw result.status === "failed"
      ? result.error
      : new Error("Object sprite workflow suspended.");
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
    "Reference image 1 is a checkerboard layout guide. Use it as the exact composition template with exact sizes, all cells are square all equal size.",
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
    ...request.states.map(
      (state, row) =>
        `Row ${row}: ${state.title} (${state.id})${state.prompt ? ` - ${state.prompt}` : ""}`,
    ),
    "",
    "Columns, left to right:",
    ...columnLabels.map((label, column) => `Column ${column}: ${label}.`),
    "",
    "Column behavior:",
    ...buildColumnBehaviorPrompt(request),
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

function buildColumnBehaviorPrompt(request: ObjectSpriteRequest): string[] {
  if (request.spriteKind === "plant" || request.spriteKind === "tree") {
    const growthSubject = request.spriteKind === "tree" ? "tree" : "plant";
    const harvestedSubject =
      request.spriteKind === "tree"
        ? "tree trunk, stump, or canopy remnants"
        : "plant remnants";
    const pickupSubject =
      request.spriteKind === "tree"
        ? "fruit, cone, branch, seed pod, resin, leaf bundle, or magical tree resource pickups"
        : "crop/resource pickups";

    return [
      "For seed rows, column 1 is an isolated collectible seed item with no dirt below it. Columns 2 through the end are planted seed growth steps from left to right.",
      "For grown or harvest-ready rows, columns are different stable variants of the same mature state, not a transformation sequence.",
      `For harvested rows, the first half of columns are post-harvest ${harvestedSubject} left in the ground, and the second half are isolated ${pickupSubject}.`,
      "Keep all columns in a row coherent for that row's state, not different unrelated designs.",
      `Preserve the same silhouette language and materials across all states so the ${growthSubject} clearly evolves from row to row.`,
      ...(request.spriteKind === "tree"
        ? [
            "Tree frames should be rooted at the bottom center of each cell, with trunks growing upward from a stable ground contact point.",
            "Keep canopies readable from a three-quarter top-down view without covering neighboring cells.",
          ]
        : []),
    ];
  }

  if (request.spriteKind === "player") {
    return [
      "This is a square 4x4 player animation sheet.",
      "Rows are animation states: row 0 idle_1, row 1 idle_2, row 2 move_1, row 3 move_2.",
      "Columns 0-2 are facing directions: column 0 down, column 1 side/right, column 2 up.",
      "Column 3 is for reusable action/interact poses. These poses must work for foraging, digging, grabbing, picking up, planting, harvesting, and using something near the ground.",
      "Action column rows 0-2 are the same generic action pose in each direction: down, side/right, and up. Row 3 column 3 is a side sleeping/resting pose.",
      "Side-facing cells must face right; the game will mirror them for left movement.",
      "Each cell must use the exact state and direction for its row and column.",
      "Keep the player's feet or ground contact point consistent inside each direction column so movement does not wobble.",
      "Use the same character design, outfit, proportions, and equipment silhouette in every cell.",
      "Exact cell poses:",
      "Row 0 column 0, idle_1 down: head faces camera/down, torso faces down, weight slightly on left foot, left shoulder a little lower, hands relaxed low.",
      "Row 0 column 1, idle_1 side: character faces right, head in right profile, weight on rear/left foot, front/right foot light, hands relaxed.",
      "Row 0 column 2, idle_1 up: head faces away/up, back of head visible, torso faces away, weight slightly on left foot, hands relaxed low.",
      "Row 0 column 3, generic action down: character faces camera/down while interacting with the ground. Knees bent in a stable crouch, torso leaning forward, head lowered, both hands reaching down in front of the feet as if foraging, digging, grabbing, planting, or picking something up.",
      "Row 1 column 0, idle_2 down: head faces camera/down, torso faces down, weight slightly on right foot, right shoulder a little lower, hands shifted subtly from idle_1.",
      "Row 1 column 1, idle_2 side: character faces right, head in right profile, weight on front/right foot, rear/left foot light, head and shoulders subtly bobbed from idle_1.",
      "Row 1 column 2, idle_2 up: head faces away/up, back of head visible, torso faces away, weight slightly on right foot, hands shifted subtly from idle_1.",
      "Row 1 column 3, generic action side: character faces right in profile while interacting with the ground. Knees bent in a stable crouch, torso leaning forward, head angled down, front/right hand reaching down and forward, rear/left hand supporting balance near the body. This must read as foraging, digging, grabbing, planting, or picking something up from the side.",
      "Row 2 column 0, move_1 down: head faces camera/down. Left leg is the forward/front/contact leg, with left foot lower in the cell. Right leg is the rear/back leg, with right foot higher in the cell. Right hand swings forward/down; left hand swings back/up.",
      "Row 2 column 1, move_1 side: character faces right. RIGHT leg is the forward/front/contact leg, with right foot visibly in front of the body and farther to the right. LEFT leg is the rear/back leg, with left foot visibly behind the body and farther to the left. RIGHT hand swings back/left behind the torso. LEFT hand swings forward/right in front of the torso.",
      "Row 2 column 2, move_1 up: head faces away/up. Left leg is the forward/front/contact leg, with left foot higher in the cell. Right leg is the rear/back leg, with right foot lower in the cell. Right hand swings forward/up; left hand swings back/down.",
      "Row 2 column 3, generic action up: character faces away/up while interacting with the ground. Back of head visible, knees bent in a stable crouch, torso leaning forward away from camera, shoulders rounded, both hands reaching down above/away from the body as if foraging, digging, grabbing, planting, or picking something up.",
      "Row 3 column 0, move_2 down: head faces camera/down. Right leg is the forward/front/contact leg, with right foot lower in the cell. Left leg is the rear/back leg, with left foot higher in the cell. Left hand swings forward/down; right hand swings back/up. This must visibly swap the front and back legs from row 2 column 0.",
      "Row 3 column 1, move_2 side: character faces right. LEFT leg is the forward/front/contact leg, with left foot visibly in front of the body and farther to the right. RIGHT leg is the rear/back leg, with right foot visibly behind the body and farther to the left. RIGHT hand swings forward/right in front of the torso. LEFT hand swings back/left behind the torso. This must be the exact reverse of row 2 column 1: the front leg, back leg, front hand, and back hand all swap sides. Do not reuse the same side-walk silhouette.",
      "Row 3 column 2, move_2 up: head faces away/up. Right leg is the forward/front/contact leg, with right foot higher in the cell. Left leg is the rear/back leg, with left foot lower in the cell. Left hand swings forward/up; right hand swings back/down. This must visibly swap the front and back legs from row 2 column 2.",
      "Row 3 column 3, side sleeping/resting: character lies on their side facing right, curled or relaxed sleeping pose, head resting low, knees slightly bent, arms tucked near torso.",
    ];
  }

  return [
    "Within each row, columns should be coherent frames or variants for that same state, not different unrelated designs.",
    "Frame-to-frame changes should be readable but modest, suitable for stepping through in a 2D game.",
    "Preserve the same silhouette language and materials across all states.",
  ];
}

async function createLayoutGuide(
  request: ObjectSpriteRequest,
  fileName = "object-sprite-layout-guide.png",
): Promise<{ dataUrl: string; filePath: string }> {
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
  const filePath = path.join(request.outputDir, fileName);

  await mkdir(request.outputDir, { recursive: true });
  await writeFile(filePath, png);
  logProgress(`Wrote layout guide: ${filePath}`);

  return {
    dataUrl: `data:image/png;base64,${png.toString("base64")}`,
    filePath,
  };
}

function buildObjectSpriteCells(
  request: ObjectSpriteRequest,
): ObjectSpriteManifest["cells"] {
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

function normalizeColumnLabels(
  request: ObjectSpriteRequest,
): ObjectSpriteRequest {
  return {
    ...request,
    columnLabels: getColumnLabels(request),
  };
}

function getColumnLabels(request: ObjectSpriteRequest): string[] {
  if (request.columnLabels && request.columnLabels.length > 0) {
    return Array.from(
      { length: request.columns },
      (_, index) => request.columnLabels?.[index] ?? `frame ${index + 1}`,
    );
  }

  return Array.from(
    { length: request.columns },
    (_, index) => `frame ${index + 1}`,
  );
}

function logProgress(message: string): void {
  if (process.env.PANTHEON_ASSETS_LOG === "0") {
    return;
  }

  console.error(`[object-sprite] ${message}`);
}
