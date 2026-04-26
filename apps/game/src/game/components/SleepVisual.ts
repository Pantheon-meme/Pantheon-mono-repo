import Phaser from "phaser";

export class SleepVisual {
  constructor(
    public readonly shadow: Phaser.GameObjects.Ellipse,
    public readonly marker: Phaser.GameObjects.Text,
  ) {}
}
