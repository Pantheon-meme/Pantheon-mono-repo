export class TerrainHardness {
  constructor(
    public readonly defaultLayerId = "vibrant-grass",
    public readonly layerHardness = new Map<string, number>([
      ["vibrant-grass", 1],
      ["dirt", 1],
      ["stone", 4],
      ["mountain", 6],
    ]),
    public readonly deepHardnessByDepth = [3, 5, 8, 12],
  ) {}

  getLayerHardness(layerId: string): number {
    return this.layerHardness.get(layerId) ?? 1;
  }

  getDeepHardness(currentDepth: number): number {
    return (
      this.deepHardnessByDepth[currentDepth] ??
      this.deepHardnessByDepth[this.deepHardnessByDepth.length - 1] ??
      3
    );
  }
}
