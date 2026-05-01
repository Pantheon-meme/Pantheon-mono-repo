import Phaser from "phaser";

export type HudSlotKind = "tool" | "item";

export type HudSlot = {
  id: string;
  kind: HudSlotKind;
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Image;
  hover: Phaser.GameObjects.Image;
  selection: Phaser.GameObjects.Image;
  iconPlaceholder: Phaser.GameObjects.Container;
  iconSprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  count: Phaser.GameObjects.Text;
  shortcut: Phaser.GameObjects.Text;
  lockOverlay: Phaser.GameObjects.Rectangle;
  pulse: Phaser.GameObjects.Rectangle;
  hovered: boolean;
};

export class ToolInventoryHud {
  selectedSlotId = "tool:hands";
  signature = "";

  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly background: Phaser.GameObjects.NineSlice,
    public readonly toolsLabel: Phaser.GameObjects.Text,
    public readonly itemsLabel: Phaser.GameObjects.Text,
    public readonly capacityLabel: Phaser.GameObjects.Text,
    public readonly divider: Phaser.GameObjects.Image,
    public readonly slots: HudSlot[],
    public readonly screenYFromBottom: number,
    public readonly width: number,
    public readonly displayScale: number,
  ) {}
}
