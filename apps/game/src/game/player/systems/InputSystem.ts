import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { InputState } from "../components/InputState";
import { PlayerControlled } from "../components/PlayerControlled";

export class InputSystem implements System {
  constructor(
    private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    private readonly wasd: Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >,
  ) {}

  update(world: World): void {
    for (const [, , input] of world.query(PlayerControlled, InputState)) {
      input.directionX = this.readAxis(
        this.cursors.left.isDown || this.wasd.A.isDown,
        this.cursors.right.isDown || this.wasd.D.isDown,
      );
      input.directionY = this.readAxis(
        this.cursors.up.isDown || this.wasd.W.isDown,
        this.cursors.down.isDown || this.wasd.S.isDown,
      );
    }
  }

  private readAxis(negativePressed: boolean, positivePressed: boolean): number {
    if (negativePressed === positivePressed) {
      return 0;
    }

    return negativePressed ? -1 : 1;
  }
}
