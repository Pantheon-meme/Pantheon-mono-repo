import Phaser from "phaser";

export class AutotileLayer {
  renderedVersion = -1;

  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly atlasKey: string,
    public readonly texturePrefix: string,
    public readonly sourceTileSize: number,
  ) {}
}
