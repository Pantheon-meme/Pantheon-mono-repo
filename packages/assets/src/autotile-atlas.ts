import path from "node:path";

import sharp from "sharp";

export const combinedAutotileAtlasFileName = "autotile-blob-7x7.png";

const outputColumns = 7;
const outputRows = 7;
const outputCellSize = 256;

type CropRegion = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type Placement = {
  input: string;
  sourceGridSize: number;
  sourceColumn: number;
  sourceRow: number;
  outputColumn: number;
  outputRow: number;
};

export async function combineAutotileAtlas(inputDir: string, outputPath?: string): Promise<string> {
  const leftTop = path.join(inputDir, "autotile-left-top.png");
  const rightTopA = path.join(inputDir, "autotile-right-top-a.png");
  const rightTopB = path.join(inputDir, "autotile-right-top-b.png");
  const leftBottom = path.join(inputDir, "autotile-left-bottom.png");
  const rightBottom = path.join(inputDir, "autotile-right-bottom.png");
  const resolvedOutputPath = outputPath ?? path.join(inputDir, combinedAutotileAtlasFileName);

  const placements: Placement[] = [
    ...createGridPlacements(leftTop, 4, 0, 0, 4, 4),
    ...createGridPlacements(rightTopA, 3, 4, 0, 3, 3),
    ...createGridPlacements(rightTopB, 3, 4, 3, 3, 1, 1),
    ...createGridPlacements(leftBottom, 4, 0, 4, 4, 3),
    ...createGridPlacements(rightBottom, 3, 4, 4, 3, 3),
  ];

  const composites = await Promise.all(
    placements.map(async (placement) => {
      const region = await getGridRegion(placement.input, placement.sourceGridSize, placement.sourceColumn, placement.sourceRow);
      const input = await sharp(placement.input)
        .extract(region)
        .resize(outputCellSize, outputCellSize, { fit: "fill" })
        .png()
        .toBuffer();

      return {
        input,
        left: placement.outputColumn * outputCellSize,
        top: placement.outputRow * outputCellSize,
      };
    }),
  );

  await sharp({
    create: {
      width: outputColumns * outputCellSize,
      height: outputRows * outputCellSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(resolvedOutputPath);

  return resolvedOutputPath;
}

function createGridPlacements(
  input: string,
  sourceGridSize: number,
  outputColumnStart: number,
  outputRowStart: number,
  columns: number,
  rows: number,
  sourceRowStart = 0,
): Placement[] {
  const placements: Placement[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      placements.push({
        input,
        sourceGridSize,
        sourceColumn: column,
        sourceRow: sourceRowStart + row,
        outputColumn: outputColumnStart + column,
        outputRow: outputRowStart + row,
      });
    }
  }

  return placements;
}

async function getGridRegion(input: string, gridSize: number, column: number, row: number): Promise<CropRegion> {
  const metadata = await sharp(input).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read image dimensions for ${input}`);
  }

  const left = Math.round((metadata.width * column) / gridSize);
  const top = Math.round((metadata.height * row) / gridSize);
  const right = Math.round((metadata.width * (column + 1)) / gridSize);
  const bottom = Math.round((metadata.height * (row + 1)) / gridSize);

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}
