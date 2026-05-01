import Phaser from "phaser";

export type InventorySlotView = {
  slot: number;
  background: Phaser.GameObjects.Rectangle;
  icon?: Phaser.GameObjects.Sprite;
  fallbackIcon?: Phaser.GameObjects.Ellipse;
  label: Phaser.GameObjects.Text;
};

export class InventoryHud {
  signature = "";
  readonly slotViews: InventorySlotView[] = [];

  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly title: Phaser.GameObjects.Text,
    public readonly screenX: number,
    public readonly screenY: number,
  ) {}
}
