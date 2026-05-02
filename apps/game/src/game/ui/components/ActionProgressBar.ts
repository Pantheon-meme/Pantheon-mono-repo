import Phaser from "phaser";

export class ActionProgressBar {
  finalAnimationKey?: string;
  finalAnimationElapsedSeconds = 0;

  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly track: Phaser.GameObjects.Image,
    public readonly fill: Phaser.GameObjects.NineSlice,
    public readonly iconFrame: Phaser.GameObjects.Image,
    public readonly icon: Phaser.GameObjects.Image,
    public readonly finalStatusIcon: Phaser.GameObjects.Image,
    public readonly width: number,
    public readonly height: number,
    public readonly fillFullWidth: number,
    public readonly fillHeight: number,
    public readonly fillX: number,
    public readonly fillY: number,
    public readonly offsetY: number,
  ) {}
}
