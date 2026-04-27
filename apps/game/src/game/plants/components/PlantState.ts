export type PlantStage = "seed" | "growing" | "grown" | "fetched";

export class PlantState {
  elapsedSeconds = 0;
  stage: PlantStage = "seed";

  constructor(
    public readonly plantId: string,
    public readonly tileX: number,
    public readonly tileY: number,
  ) {}
}
