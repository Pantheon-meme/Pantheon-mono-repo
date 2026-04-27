import Phaser from "phaser";

export class TerrainBaseLayer {
  rendered = false;

  constructor(
    public readonly graphics: Phaser.GameObjects.Graphics,
    public readonly baseColor: number,
    public readonly variantColor: number,
    public readonly shadowColor: number,
  ) {}
}
