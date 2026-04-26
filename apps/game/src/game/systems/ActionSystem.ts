import Phaser from "phaser";
import type { System } from "../../ecs/System";
import type { World } from "../../ecs/World";
import { actionDefinitions } from "../actions/ActionDefinition";
import { ActionLog } from "../components/ActionLog";
import { ActionQueue } from "../components/ActionQueue";
import { Energy } from "../components/Energy";

export class ActionSystem implements System {
  update(world: World): void {
    for (const [, queue, energy, log] of world.query(ActionQueue, Energy, ActionLog)) {
      let actionId = queue.shift();

      while (actionId) {
        const action = actionDefinitions[actionId];

        if (!action) {
          log.lastMessage = `Unknown action: ${actionId}`;
          actionId = queue.shift();
          continue;
        }

        if (action.energyDelta < 0 && energy.current < Math.abs(action.energyDelta)) {
          log.lastMessage = `${action.label} needs ${Math.abs(action.energyDelta)} energy`;
          actionId = queue.shift();
          continue;
        }

        energy.current = Phaser.Math.Clamp(energy.current + action.energyDelta, 0, energy.max);
        log.lastMessage =
          action.energyDelta === 0
            ? `${action.label}: no energy change`
            : `${action.label}: ${action.energyDelta > 0 ? "+" : ""}${action.energyDelta} energy`;

        actionId = queue.shift();
      }
    }
  }
}
