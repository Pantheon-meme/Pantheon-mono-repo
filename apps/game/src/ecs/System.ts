import type { World } from "./World";

export interface System {
  update(world: World, deltaSeconds: number): void;
}
