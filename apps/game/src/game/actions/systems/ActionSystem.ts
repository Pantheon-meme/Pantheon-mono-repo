import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { Entity } from "../../../ecs/World";
import type { World } from "../../../ecs/World";
import { actionDefinitions } from "../ActionDefinition";
import { ActionLog } from "../components/ActionLog";
import { ActionProgress } from "../components/ActionProgress";
import { ActionQueue } from "../components/ActionQueue";
import { Energy } from "../../energy/components/Energy";
import { MovementState } from "../../player/components/MovementState";
import { Position } from "../../shared/components/Position";
import { SleepState } from "../../sleep/components/SleepState";
import { TerrainGrid } from "../../terrain/components/TerrainGrid";
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
        this.updateProgress(
          world,
          entity,
          queue,
          energy,
          log,
          progress,
          deltaSeconds,
        );
        continue;
      }

      this.startNextAction(world, entity, queue, energy, log, progress);
    }
  }

  private updateProgress(
    world: World,
    entity: Entity,
    queue: ActionQueue,
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

    this.completeAction(world, entity, queue, energy, log, action);
  }

  private startNextAction(
    world: World,
    entity: Entity,
    queue: ActionQueue,
    energy: Energy,
    log: ActionLog,
    progress: ActionProgress,
  ): void {
    let actionId = queue.peek();

    while (actionId) {
      const sleep = world.getComponent(entity, SleepState);

      if (sleep?.active) {
        log.lastMessage = "Sleeping...";
        return;
      }

      const action = actionDefinitions[actionId];

      if (!action) {
        log.lastMessage = `Unknown action: ${actionId}`;
        queue.shift();
        actionId = queue.peek();
        continue;
      }

      if (!isMovementSettled(world, entity)) {
        log.lastMessage = `${action.label}: waiting for movement`;
        return;
      }

      if (!hasEnoughEnergy(energy, action)) {
        log.lastMessage = `${action.label} needs ${Math.abs(action.energyDelta)} energy`;
        queue.shift();
        actionId = queue.peek();
        continue;
      }

      const startResult = action.canStart?.(world, entity);

      if (startResult?.applied === false) {
        log.lastMessage = startResult.message ?? `${action.label}: no effect`;
        if (startResult.retry) {
          return;
        }

        queue.shift();
        actionId = queue.peek();
        continue;
      }

      queue.shift();
      progress.start(action.id, action.label, action.durationSeconds);
      log.lastMessage = `${action.label}: started`;

      if (action.durationSeconds <= 0) {
        this.updateProgress(world, entity, queue, energy, log, progress, 0);
      }

      return;
    }
  }

  private completeAction(
    world: World,
    entity: Entity,
    queue: ActionQueue,
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
      if (result.retry) {
        queue.unshift(action.id);
      }

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

function isMovementSettled(world: World, entity: Entity): boolean {
  const movement = world.getComponent(entity, MovementState);
  const position = world.getComponent(entity, Position);
  const grid = world.query(TerrainGrid)[0]?.[1];

  if (!movement || !position || !grid) {
    return true;
  }

  const currentTileX = Math.floor(position.x / grid.tileSize);
  const currentTileY = Math.floor(position.y / grid.tileSize);

  return (
    !movement.pending &&
    movement.queuedTileX === undefined &&
    movement.queuedTileY === undefined &&
    movement.confirmedTileX === currentTileX &&
    movement.confirmedTileY === currentTileY
  );
}

function hasEnoughEnergy(energy: Energy, action: ActionDefinition): boolean {
  return (
    action.energyDelta >= 0 || energy.current >= Math.abs(action.energyDelta)
  );
}
