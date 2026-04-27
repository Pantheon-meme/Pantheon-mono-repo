import Phaser from "phaser";

export class SeedDropVisual {
  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly body: Phaser.GameObjects.Ellipse,
    public readonly label: Phaser.GameObjects.Text,
  ) {}
}
