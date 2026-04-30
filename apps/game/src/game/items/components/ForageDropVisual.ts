import Phaser from "phaser";

export class ForageDropVisual {
  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly sprite: Phaser.GameObjects.Sprite | undefined,
    public readonly body: Phaser.GameObjects.Ellipse,
    public readonly glint: Phaser.GameObjects.Star,
    public readonly label: Phaser.GameObjects.Text,
  ) {}
}
