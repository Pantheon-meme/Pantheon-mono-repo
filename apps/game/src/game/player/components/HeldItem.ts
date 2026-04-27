import type { Entity } from "../../../ecs/World";
import type { HandId } from "./Hands";

export class HeldItem {
  constructor(
    public readonly holder: Entity,
    public readonly hand: HandId,
  ) {}
}
