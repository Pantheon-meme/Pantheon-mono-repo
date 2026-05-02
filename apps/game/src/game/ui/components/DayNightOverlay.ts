import Phaser from "phaser";

export type HudSystemButtonId = "journal" | "map" | "settings";

export type HudSystemButton = {
  id: HudSystemButtonId;
  background: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  pendingClick: boolean;
};

export class DayNightOverlay {
  constructor(
    public readonly shade: Phaser.GameObjects.Rectangle,
    public readonly panel: Phaser.GameObjects.Rectangle,
    public readonly label: Phaser.GameObjects.Text,
    public readonly phase: Phaser.GameObjects.Text,
    public readonly buttons: HudSystemButton[],
    public readonly screenX: number,
    public readonly screenY: number,
  ) {}
}
