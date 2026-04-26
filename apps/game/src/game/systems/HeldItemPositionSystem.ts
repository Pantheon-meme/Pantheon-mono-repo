import type { System } from "../../ecs/System";
import type { World } from "../../ecs/World";
import { FacingDirection } from "../components/FacingDirection";
import { HeldItem } from "../components/HeldItem";
import { Position } from "../components/Position";

export class HeldItemPositionSystem implements System {
  update(world: World): void {
    for (const [, position, held] of world.query(Position, HeldItem)) {
      const holderPosition = world.getComponent(held.holder, Position);
      const facing = world.getComponent(held.holder, FacingDirection);

      if (!holderPosition) {
        continue;
      }

      const facingX = facing?.x ?? 0;
      const facingY = facing?.y ?? 1;
      const sideX = held.hand === "left" ? -1 : 1;
      const perpendicularX = facingY === 0 ? 0 : sideX;
      const perpendicularY = facingX === 0 ? 0 : -facingX * sideX;

      position.x = holderPosition.x + facingX * 34 + perpendicularX * 36;
      position.y = holderPosition.y + facingY * 34 + perpendicularY * 36;
    }
  }
}
