import Phaser from "phaser";

export class AutotileLayer {
  renderedVersion = -1;

  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly atlasKey: string,
    public readonly texturePrefix: string,
    public readonly sourceTileSize: number,
    public readonly centerVariantAtlasKey?: string,
    public readonly centerVariantColumns = 4,
    public readonly centerVariantRows = 4,
  ) {}
}
