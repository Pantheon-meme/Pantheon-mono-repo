import Phaser from "phaser";

export type HudSystemButtonId = "journal" | "map" | "settings";

export type HudSystemButton = {
  id: HudSystemButtonId;
  container: Phaser.GameObjects.Container;
  active: Phaser.GameObjects.Image;
  inactive: Phaser.GameObjects.Image;
  hitArea: Phaser.GameObjects.Zone;
  pendingClick: boolean;
  pressed: boolean;
  pressTween?: Phaser.Tweens.Tween;
};

export class DayNightOverlay {
  constructor(
    public readonly shade: Phaser.GameObjects.Rectangle,
    public readonly container: Phaser.GameObjects.Container,
    public readonly buttonsContainer: Phaser.GameObjects.Container,
    public readonly artwork: Phaser.GameObjects.Image,
    public readonly artworkMask: Phaser.GameObjects.Graphics,
    public readonly frame: Phaser.GameObjects.Image,
    public readonly panel: Phaser.GameObjects.NineSlice,
    public readonly label: Phaser.GameObjects.Text,
    public readonly buttons: HudSystemButton[],
    public readonly width: number,
    public readonly height: number,
    public readonly displayScale: number,
    public readonly buttonRowWidth: number,
    public readonly buttonRowHeight: number,
    public readonly buttonGapY: number,
    public readonly panelY: number,
    public readonly screenX: number,
    public readonly screenY: number,
  ) {}
}
