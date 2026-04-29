import Phaser from "phaser";

export type TerrainBackgroundMode = "flat" | string;

export class TerrainBackground {
  renderedVersion = -1;

  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly modes: TerrainBackgroundMode[],
    public activeMode: TerrainBackgroundMode,
  ) {}
}
