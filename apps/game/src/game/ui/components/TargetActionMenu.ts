import Phaser from "phaser";

export type TargetActionButton = {
  actionId: string;
  background: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
};

export class TargetActionMenu {
  signature = "";
  readonly buttons: TargetActionButton[] = [];

  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly background: Phaser.GameObjects.Rectangle,
    public readonly title: Phaser.GameObjects.Text,
    public readonly width: number,
    public readonly rowHeight: number,
  ) {}
}
