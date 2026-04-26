import Phaser from "phaser";
import type { System } from "../../ecs/System";
import type { World } from "../../ecs/World";
import { ActionLog } from "../components/ActionLog";
import { Energy } from "../components/Energy";
import { SleepState } from "../components/SleepState";

export class SleepSystem implements System {
  update(world: World, deltaSeconds: number): void {
    for (const [, sleep, energy, log] of world.query(
      SleepState,
      Energy,
      ActionLog,
    )) {
      if (!sleep.active) {
        continue;
      }

      const availableEnergy = Math.max(0, energy.max - energy.current);
      sleep.elapsedSeconds = Math.min(
        sleep.durationSeconds,
        sleep.elapsedSeconds + deltaSeconds,
      );
      sleep.pendingEnergy = Math.min(
        availableEnergy,
        sleep.elapsedSeconds * sleep.energyPerSecond,
      );

      if (sleep.elapsedSeconds < sleep.durationSeconds) {
        continue;
      }

      const energyGain = sleep.finish();
      energy.current = Phaser.Math.Clamp(
        energy.current + energyGain,
        0,
        energy.max,
      );
      log.lastMessage = `Woke up: +${energyGain} energy`;
    }
  }
}
