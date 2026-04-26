import Phaser from "phaser";
import type { System } from "../../ecs/System";
import type { World } from "../../ecs/World";
import { Energy } from "../components/Energy";
import { InputState } from "../components/InputState";

export class EnergySystem implements System {
  update(world: World, deltaSeconds: number): void {
    for (const [, energy, input] of world.query(Energy, InputState)) {
      const isMoving = input.directionX !== 0 || input.directionY !== 0;
      const delta = isMoving ? -energy.moveDrainPerSecond : energy.idleRegenPerSecond;

      energy.current = Phaser.Math.Clamp(energy.current + delta * deltaSeconds, 0, energy.max);

      if (energy.current <= 0 && isMoving) {
        input.directionX = 0;
        input.directionY = 0;
      }
    }
  }
}
