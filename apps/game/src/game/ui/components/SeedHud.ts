import Phaser from "phaser";

export class SeedHud {
  constructor(
    public readonly label: Phaser.GameObjects.Text,
    public readonly screenX: number,
    public readonly screenY: number,
  ) {}
}
