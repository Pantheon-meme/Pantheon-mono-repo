import Phaser from "phaser";

export class EnergyBar {
  displayedFillWidth: number | undefined;
  fillTransitionStartWidth = 0;
  fillTransitionTargetWidth = 0;
  fillTransitionElapsed = 0;
  fillTransitionDuration = 0;
  fillPulseElapsed = 0;

  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly background: Phaser.GameObjects.Image,
    public readonly fill: Phaser.GameObjects.NineSlice,
    public readonly icon: Phaser.GameObjects.Image,
    public readonly value: Phaser.GameObjects.Text,
    public readonly region: Phaser.GameObjects.Text,
    public readonly width: number,
    public readonly height: number,
    public readonly visualWidth: number,
    public readonly visualHeight: number,
    public readonly screenX: number,
    public readonly screenY: number,
  ) {}
}
