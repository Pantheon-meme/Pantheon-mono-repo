import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { ActionLog } from "../../actions/components/ActionLog";
import { SleepState } from "../components/SleepState";

export class SleepSystem implements System {
  update(world: World, deltaSeconds: number): void {
    for (const [, sleep, log] of world.query(
      SleepState,
      ActionLog,
    )) {
      if (!sleep.active) {
        continue;
      }

      if (!sleep.onchainStarted) {
        log.lastMessage = "Sleep: syncing";
        continue;
      }

      sleep.elapsedSeconds = Math.min(
        sleep.durationSeconds,
        sleep.elapsedSeconds + deltaSeconds,
      );

      if (sleep.elapsedSeconds < sleep.durationSeconds) {
        continue;
      }

      log.lastMessage = "Sleep: rested";
      sleep.finish();
    }
  }
}
