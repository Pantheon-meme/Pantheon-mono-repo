import Phaser from "phaser";

export type TargetActionButton = {
  actionId: string;
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  iconFrame: Phaser.GameObjects.Arc;
  icon: Phaser.GameObjects.Text;
  label: Phaser.GameObjects.Text;
  detail: Phaser.GameObjects.Text;
  shortcut: Phaser.GameObjects.Text;
  status: Phaser.GameObjects.Rectangle;
  x: number;
  width: number;
};

export class TargetActionMenu {
  signature = "";
  scrollX = 0;
  maxScrollX = 0;
  readonly buttons: TargetActionButton[] = [];

  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly background: Phaser.GameObjects.Rectangle,
    public readonly title: Phaser.GameObjects.Text,
    public readonly content: Phaser.GameObjects.Container,
    public readonly leftIndicator: Phaser.GameObjects.Text,
    public readonly rightIndicator: Phaser.GameObjects.Text,
    public readonly width: number,
    public readonly rowHeight: number,
  ) {}
}
