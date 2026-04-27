import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { GameClock } from "../components/GameClock";

export class GameClockSystem implements System {
  update(world: World, deltaSeconds: number): void {
    for (const [, clock] of world.query(GameClock)) {
      clock.advance(deltaSeconds);
    }
  }
}
