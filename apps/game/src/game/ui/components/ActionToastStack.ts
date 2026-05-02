import Phaser from "phaser";
import type { HudStatus } from "../HudTheme";

export type ActionToastCard = {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.NineSlice;
  kindIcon: Phaser.GameObjects.Image;
  statusIcon: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  ageSeconds: number;
  durationSeconds: number;
  status: HudStatus;
};

export class ActionToastStack {
  lastMessage = "";
  readonly cards: ActionToastCard[] = [];

  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly screenX: number,
    public readonly screenY: number,
    public readonly width: number,
  ) {}
}
