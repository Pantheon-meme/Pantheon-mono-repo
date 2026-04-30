import Phaser from "phaser";

export class ActionProgressBar {
  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly panel: Phaser.GameObjects.Rectangle,
    public readonly track: Phaser.GameObjects.Rectangle,
    public readonly fill: Phaser.GameObjects.Rectangle,
    public readonly iconFrame: Phaser.GameObjects.Arc,
    public readonly icon: Phaser.GameObjects.Text,
    public readonly label: Phaser.GameObjects.Text,
    public readonly detail: Phaser.GameObjects.Text,
    public readonly width: number,
    public readonly height: number,
    public readonly offsetY: number,
  ) {}
}
