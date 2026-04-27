import Phaser from "phaser";

export class ActionProgressBar {
  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly background: Phaser.GameObjects.Rectangle,
    public readonly fill: Phaser.GameObjects.Rectangle,
    public readonly label: Phaser.GameObjects.Text,
    public readonly width: number,
    public readonly height: number,
    public readonly offsetY: number,
  ) {}
}
