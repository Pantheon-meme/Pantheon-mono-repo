import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { Entity } from "../../../ecs/World";
import type { World } from "../../../ecs/World";
import { actionDefinitions } from "../ActionDefinition";
import { ActionLog } from "../components/ActionLog";
import { ActionProgress } from "../components/ActionProgress";
import { ActionQueue } from "../components/ActionQueue";
import { Energy } from "../../energy/components/Energy";
import { SleepState } from "../../sleep/components/SleepState";
import type { ActionDefinition } from "../ActionTypes";

export class ActionSystem implements System {
  update(world: World, deltaSeconds: number): void {
    for (const [entity, queue, energy, log, progress] of world.query(
      ActionQueue,
      Energy,
      ActionLog,
      ActionProgress,
    )) {
      if (progress.active) {
        this.updateProgress(world, entity, energy, log, progress, deltaSeconds);
        continue;
      }

      this.startNextAction(world, entity, queue, energy, log, progress);
    }
  }

  private updateProgress(
    world: World,
    entity: Entity,
    energy: Energy,
    log: ActionLog,
    progress: ActionProgress,
    deltaSeconds: number,
  ): void {
    progress.elapsedSeconds += deltaSeconds;

    if (progress.elapsedSeconds < progress.durationSeconds) {
      log.lastMessage = `${progress.label}: ${Math.round(progress.ratio * 100)}%`;
      return;
    }

    const action = progress.actionId
      ? actionDefinitions[progress.actionId]
      : undefined;

    progress.clear();

    if (!action) {
      log.lastMessage = "Action fizzled";
      return;
    }

    this.completeAction(world, entity, energy, log, action);
  }

  private startNextAction(
    world: World,
    entity: Entity,
    queue: ActionQueue,
    energy: Energy,
    log: ActionLog,
    progress: ActionProgress,
  ): void {
    let actionId = queue.shift();

    while (actionId) {
      const sleep = world.getComponent(entity, SleepState);

      if (sleep?.active) {
        log.lastMessage = "Sleeping...";
        return;
      }

      const action = actionDefinitions[actionId];

      if (!action) {
        log.lastMessage = `Unknown action: ${actionId}`;
        actionId = queue.shift();
        continue;
      }

      if (!hasEnoughEnergy(energy, action)) {
        log.lastMessage = `${action.label} needs ${Math.abs(action.energyDelta)} energy`;
        actionId = queue.shift();
        continue;
      }

      const startResult = action.canStart?.(world, entity);

      if (startResult?.applied === false) {
        log.lastMessage = startResult.message ?? `${action.label}: no effect`;
        actionId = queue.shift();
        continue;
      }

      progress.start(action.id, action.label, action.durationSeconds);
      log.lastMessage = `${action.label}: started`;

      if (action.durationSeconds <= 0) {
        this.updateProgress(world, entity, energy, log, progress, 0);
      }

      return;
    }
  }

  private completeAction(
    world: World,
    entity: Entity,
    energy: Energy,
    log: ActionLog,
    action: ActionDefinition,
  ): void {
    if (!hasEnoughEnergy(energy, action)) {
      log.lastMessage = `${action.label} needs ${Math.abs(action.energyDelta)} energy`;
      return;
    }

    const result = action.apply?.(world, entity);

    if (result?.applied === false) {
      log.lastMessage = result.message ?? `${action.label}: no effect`;
      return;
    }

    energy.current = Phaser.Math.Clamp(
      energy.current + action.energyDelta,
      0,
      energy.max,
    );
    log.lastMessage =
      result?.message ??
      (action.energyDelta === 0
        ? `${action.label}: no energy change`
        : `${action.label}: ${action.energyDelta > 0 ? "+" : ""}${action.energyDelta} energy`);
  }
}

function hasEnoughEnergy(energy: Energy, action: ActionDefinition): boolean {
  return (
    action.energyDelta >= 0 || energy.current >= Math.abs(action.energyDelta)
  );
}
