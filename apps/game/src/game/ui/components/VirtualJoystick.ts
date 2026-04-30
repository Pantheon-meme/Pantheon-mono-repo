import Phaser from "phaser";

export class VirtualJoystick {
  active = false;
  pointerId?: number;
  directionX = 0;
  directionY = 0;

  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly zone: Phaser.GameObjects.Zone,
    public readonly base: Phaser.GameObjects.Image,
    public readonly thumb: Phaser.GameObjects.Image,
    public readonly radius: number,
    public readonly screenX: number,
    public readonly screenYFromBottom: number,
  ) {}
}
