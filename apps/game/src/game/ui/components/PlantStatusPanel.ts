import Phaser from "phaser";

export class PlantStatusPanel {
  signature = "";

  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly background: Phaser.GameObjects.Rectangle,
    public readonly title: Phaser.GameObjects.Text,
    public readonly body: Phaser.GameObjects.Text,
    public readonly width: number,
    public readonly height: number,
    public readonly screenX: number,
    public readonly screenY: number,
  ) {}
}
