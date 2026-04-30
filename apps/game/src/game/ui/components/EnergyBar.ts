import Phaser from "phaser";

export class EnergyBar {
  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly frame: Phaser.GameObjects.Rectangle,
    public readonly track: Phaser.GameObjects.Rectangle,
    public readonly fill: Phaser.GameObjects.Rectangle,
    public readonly iconFrame: Phaser.GameObjects.Arc,
    public readonly icon: Phaser.GameObjects.Text,
    public readonly title: Phaser.GameObjects.Text,
    public readonly value: Phaser.GameObjects.Text,
    public readonly region: Phaser.GameObjects.Text,
    public readonly warning: Phaser.GameObjects.Rectangle,
    public readonly width: number,
    public readonly height: number,
    public readonly screenX: number,
    public readonly screenY: number,
  ) {}
}
