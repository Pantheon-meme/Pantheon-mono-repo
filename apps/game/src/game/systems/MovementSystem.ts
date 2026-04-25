import type { System } from "../../ecs/System";
import type { World } from "../../ecs/World";
import { InputState } from "../components/InputState";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";

export class MovementSystem implements System {
  update(world: World, deltaSeconds: number): void {
    for (const [, position, velocity, input] of world.query(
      Position,
      Velocity,
      InputState,
    )) {
      const length = Math.hypot(input.directionX, input.directionY) || 1;

      velocity.x = (input.directionX / length) * velocity.maxSpeed;
      velocity.y = (input.directionY / length) * velocity.maxSpeed;

      position.x += velocity.x * deltaSeconds;
      position.y += velocity.y * deltaSeconds;
    }
  }
}
