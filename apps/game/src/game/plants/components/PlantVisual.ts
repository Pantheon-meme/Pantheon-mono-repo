import Phaser from "phaser";

export class PlantVisual {
  renderedStage = "";
  renderedFrame = -1;
  animationSeconds = 0;

  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly sprite: Phaser.GameObjects.Sprite | undefined,
    public readonly body: Phaser.GameObjects.Ellipse,
    public readonly stem: Phaser.GameObjects.Rectangle,
    public readonly marker: Phaser.GameObjects.Text,
  ) {}
}
