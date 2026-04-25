import Phaser from "phaser";
import type { System } from "../../ecs/System";
import type { World } from "../../ecs/World";
import { Position } from "../components/Position";

export class BoundsSystem implements System {
  constructor(private readonly bounds: Phaser.Geom.Rectangle) {}

  update(world: World): void {
    for (const [, position] of world.query(Position)) {
      position.x = Phaser.Math.Clamp(
        position.x,
        this.bounds.left,
        this.bounds.right,
      );
      position.y = Phaser.Math.Clamp(
        position.y,
        this.bounds.top,
        this.bounds.bottom,
      );
    }
  }
}
