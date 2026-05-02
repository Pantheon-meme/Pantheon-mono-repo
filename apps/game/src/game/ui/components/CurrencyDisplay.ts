import Phaser from "phaser";

export class CurrencyDisplay {
  constructor(
    public readonly background: Phaser.GameObjects.Rectangle,
    public readonly label: Phaser.GameObjects.Text,
    public readonly width: number,
    public readonly height: number,
    public readonly screenX: number,
    public readonly screenY: number,
  ) {}
}
