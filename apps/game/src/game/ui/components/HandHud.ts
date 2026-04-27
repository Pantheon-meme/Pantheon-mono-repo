import Phaser from "phaser";

export class HandHud {
  constructor(
    public readonly label: Phaser.GameObjects.Text,
    public readonly screenX: number,
    public readonly screenY: number,
  ) {}
}
