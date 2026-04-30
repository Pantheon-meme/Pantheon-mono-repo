import Phaser from "phaser";

export type HudSlotKind = "tool" | "item";

export type HudSlot = {
  id: string;
  kind: HudSlotKind;
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  selection: Phaser.GameObjects.Rectangle;
  iconFrame: Phaser.GameObjects.Arc;
  icon: Phaser.GameObjects.Text;
  label: Phaser.GameObjects.Text;
  count: Phaser.GameObjects.Text;
  shortcut: Phaser.GameObjects.Text;
  lockOverlay: Phaser.GameObjects.Rectangle;
  pulse: Phaser.GameObjects.Rectangle;
};

export class ToolInventoryHud {
  selectedSlotId = "tool:hands";
  signature = "";

  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly background: Phaser.GameObjects.Rectangle,
    public readonly toolsLabel: Phaser.GameObjects.Text,
    public readonly itemsLabel: Phaser.GameObjects.Text,
    public readonly capacityLabel: Phaser.GameObjects.Text,
    public readonly divider: Phaser.GameObjects.Rectangle,
    public readonly slots: HudSlot[],
    public readonly screenYFromBottom: number,
  ) {}
}
