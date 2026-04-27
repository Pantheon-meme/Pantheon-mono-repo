import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { FacingDirection } from "../components/FacingDirection";
import { InputState } from "../components/InputState";
import { PlayerControlled } from "../components/PlayerControlled";

export class FacingDirectionSystem implements System {
  update(world: World): void {
    for (const [, , input, facing] of world.query(
      PlayerControlled,
      InputState,
      FacingDirection,
    )) {
      if (input.directionX === 0 && input.directionY === 0) {
        continue;
      }

      if (Math.abs(input.directionX) > Math.abs(input.directionY)) {
        facing.x = Math.sign(input.directionX);
        facing.y = 0;
      } else {
        facing.x = 0;
        facing.y = Math.sign(input.directionY);
      }
    }
  }
}
