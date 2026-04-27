import Phaser from "phaser";

export class HarvestedPlantVisual {
  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly body: Phaser.GameObjects.Ellipse,
    public readonly stem: Phaser.GameObjects.Rectangle,
    public readonly marker: Phaser.GameObjects.Text,
  ) {}
}
