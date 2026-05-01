import type { Hex, PublicClient } from "viem";
import {
  decodeBoolStaticField,
  decodeBytes32String,
  decodeUint8StaticField,
  decodeUint32StaticField,
  decodeUint64StaticField,
  int32ToBytes32,
} from "./MudCodec";
import {
  plantStateExistsFieldIndex,
  plantStateFieldLayout,
  plantStateHealthFieldIndex,
  plantStatePlantIdFieldIndex,
  plantStatePlantedAtFieldIndex,
  plantStateStageFieldIndex,
  plantStateStressFieldIndex,
  plantStateTableId,
  terrainStateDigDepthFieldIndex,
  terrainStateFieldLayout,
  terrainStateLoosenedFieldIndex,
  terrainStateMaterialFieldIndex,
  terrainStateTableId,
  zeroBytes32,
} from "./MudTableIds";
import { pantheonWorldAbi } from "./MudWorldAbi";
import type {
  PlantStateSnapshot,
  TerrainStateSnapshot,
  WorldStateReadBounds,
  WorldStateSnapshot,
} from "./MudWorldTypes";

export class MudWorldStateReader {
  constructor(
    private readonly publicClient: PublicClient,
    private readonly worldAddress: Hex,
  ) {}

  async readAfterConfirmation(
    centerX: number,
    centerY: number,
    bounds: WorldStateReadBounds,
  ): Promise<WorldStateSnapshot> {
    try {
      return await this.read(centerX, centerY, bounds);
    } catch {
      return { terrain: [], plants: [] };
    }
  }

  private async read(
    centerX: number,
    centerY: number,
    bounds: WorldStateReadBounds,
  ): Promise<WorldStateSnapshot> {
    const cells = getBoundedCells(centerX, centerY, bounds);
    const keyTuples = cells.map((cell) => [
      int32ToBytes32(cell.x),
      int32ToBytes32(cell.y),
    ]);
    const [terrainExistsBlobs, plantExistsBlobs] = await Promise.all([
      this.readStaticFieldsBatch(
        terrainStateTableId,
        terrainStateFieldLayout,
        terrainStateLoosenedFieldIndex,
        keyTuples,
      ),
      this.readStaticFieldsBatch(
        plantStateTableId,
        plantStateFieldLayout,
        plantStateExistsFieldIndex,
        keyTuples,
      ),
    ]);
    const terrainCells = cells.filter((_, index) =>
      decodeBoolStaticField(terrainExistsBlobs[index]),
    );
    const plantCells = cells.filter((_, index) =>
      decodeBoolStaticField(plantExistsBlobs[index]),
    );
    const [terrain, plants] = await Promise.all([
      this.readTerrainStates(terrainCells),
      this.readPlantStates(plantCells),
    ]);

    return { terrain, plants };
  }

  private async readTerrainStates(
    cells: Array<{ x: number; y: number }>,
  ): Promise<TerrainStateSnapshot[]> {
    if (cells.length === 0) {
      return [];
    }

    const keyTuples = encodeCellKeyTuples(cells);
    const [materialBlobs, digDepthBlobs] = await Promise.all([
      this.readStaticFieldsBatch(
        terrainStateTableId,
        terrainStateFieldLayout,
        terrainStateMaterialFieldIndex,
        keyTuples,
      ),
      this.readStaticFieldsBatch(
        terrainStateTableId,
        terrainStateFieldLayout,
        terrainStateDigDepthFieldIndex,
        keyTuples,
      ),
    ]);

    return cells.map((cell, index) => ({
      ...cell,
      material: decodeBytes32String(materialBlobs[index]),
      digDepth: decodeUint32StaticField(digDepthBlobs[index]),
    }));
  }

  private async readPlantStates(
    cells: Array<{ x: number; y: number }>,
  ): Promise<PlantStateSnapshot[]> {
    if (cells.length === 0) {
      return [];
    }

    const keyTuples = encodeCellKeyTuples(cells);
    const [plantIdBlobs, plantedAtBlobs, stageBlobs, healthBlobs, stressBlobs] =
      await Promise.all([
        this.readStaticFieldsBatch(
          plantStateTableId,
          plantStateFieldLayout,
          plantStatePlantIdFieldIndex,
          keyTuples,
        ),
        this.readStaticFieldsBatch(
          plantStateTableId,
          plantStateFieldLayout,
          plantStatePlantedAtFieldIndex,
          keyTuples,
        ),
        this.readStaticFieldsBatch(
          plantStateTableId,
          plantStateFieldLayout,
          plantStateStageFieldIndex,
          keyTuples,
        ),
        this.readStaticFieldsBatch(
          plantStateTableId,
          plantStateFieldLayout,
          plantStateHealthFieldIndex,
          keyTuples,
        ),
        this.readStaticFieldsBatch(
          plantStateTableId,
          plantStateFieldLayout,
          plantStateStressFieldIndex,
          keyTuples,
        ),
      ]);

    return cells.map((cell, index) => ({
      ...cell,
      plantId: decodeBytes32String(plantIdBlobs[index]),
      plantedAt: decodeUint64StaticField(plantedAtBlobs[index]),
      stage: decodeUint8StaticField(stageBlobs[index]),
      health: decodeUint32StaticField(healthBlobs[index]),
      stress: decodeUint32StaticField(stressBlobs[index]),
    }));
  }

  private async readStaticFieldsBatch(
    tableId: Hex,
    fieldLayout: Hex,
    fieldIndex: number,
    keyTuples: Hex[][],
  ): Promise<Hex[]> {
    const chunks: Hex[][][] = [];

    for (let index = 0; index < keyTuples.length; index += 256) {
      chunks.push(keyTuples.slice(index, index + 256));
    }

    const results: Hex[] = [];

    for (const chunk of chunks) {
      results.push(
        ...(await Promise.all(
          chunk.map((keyTuple) =>
            this.publicClient
              .readContract({
                address: this.worldAddress,
                abi: pantheonWorldAbi,
                functionName: "getStaticField",
                args: [tableId, keyTuple, fieldIndex, fieldLayout],
              })
              .catch(() => zeroBytes32),
          ),
        )),
      );
    }

    return results;
  }
}

function encodeCellKeyTuples(
  cells: Array<{ x: number; y: number }>,
): Hex[][] {
  return cells.map((cell) => [int32ToBytes32(cell.x), int32ToBytes32(cell.y)]);
}

function getBoundedCells(
  centerX: number,
  centerY: number,
  bounds: WorldStateReadBounds,
): Array<{ x: number; y: number }> {
  const minX = Math.max(0, centerX - bounds.radius);
  const maxX = Math.min(bounds.width - 1, centerX + bounds.radius);
  const minY = Math.max(0, centerY - bounds.radius);
  const maxY = Math.min(bounds.height - 1, centerY + bounds.radius);
  const cells: Array<{ x: number; y: number }> = [];

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      cells.push({ x, y });
    }
  }

  return cells;
}
