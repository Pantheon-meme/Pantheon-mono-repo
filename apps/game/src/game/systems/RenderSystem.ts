import type { System } from "../../ecs/System";
import type { World } from "../../ecs/World";
import { Position } from "../components/Position";
import { Renderable } from "../components/Renderable";

export class RenderSystem implements System {
  update(world: World): void {
    for (const [, position, renderable] of world.query(Position, Renderable)) {
      renderable.sprite.setPosition(position.x, position.y);
    }
  }
}
