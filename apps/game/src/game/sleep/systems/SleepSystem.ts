import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { ActionLog } from "../../actions/components/ActionLog";
import { submitSleepEnergy } from "../../actions/SleepActions";
import { Energy } from "../../energy/components/Energy";
import { SleepState } from "../components/SleepState";

export class SleepSystem implements System {
  update(world: World, deltaSeconds: number): void {
    for (const [entity, sleep, energy, log] of world.query(
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

      const energyGain = Math.floor(sleep.pendingEnergy);
      const result = submitSleepEnergy(world, entity, energyGain);

      log.lastMessage = result.message ?? `Sleep: +${energyGain} energy`;

      if (result.applied === false) {
        continue;
      }

      sleep.finish();
    }
  }
}
