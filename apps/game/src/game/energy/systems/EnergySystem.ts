import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { Energy } from "../components/Energy";

export class EnergySystem implements System {
  update(world: World, deltaSeconds: number): void {
    for (const [, energy] of world.query(Energy)) {
      energy.current = Phaser.Math.Clamp(
        energy.current + energy.idleRegenPerSecond * deltaSeconds,
        0,
        energy.max,
      );
    }
  }
}
