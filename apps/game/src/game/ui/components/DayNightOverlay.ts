import Phaser from "phaser";

export class DayNightOverlay {
  constructor(
    public readonly shade: Phaser.GameObjects.Rectangle,
    public readonly label: Phaser.GameObjects.Text,
    public readonly screenX: number,
    public readonly screenY: number,
  ) {}
}
