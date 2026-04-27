import type { Entity } from "../../../ecs/World";

export type HandId = "left" | "right";

export type HandSlot = {
  held?: Entity;
};

export class Hands {
  readonly maxHandWeight = 1;
  readonly left: HandSlot = {};
  readonly right: HandSlot = {};

  get(hand: HandId): HandSlot {
    return hand === "left" ? this.left : this.right;
  }
}
