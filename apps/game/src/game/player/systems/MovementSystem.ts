import type { System } from "../../../ecs/System";
import type { Entity } from "../../../ecs/World";
import type { World } from "../../../ecs/World";
import { ActionLog } from "../../actions/components/ActionLog";
import { Energy } from "../../energy/components/Energy";
import { MudWorld } from "../../mud/components/MudWorld";
import type { MudMoveCallbacks } from "../../mud/MudWorldBridge";
import { FreeExploreMode } from "../components/FreeExploreMode";
import { InputState } from "../components/InputState";
import { MovementState } from "../components/MovementState";
import { Position } from "../../shared/components/Position";
import { SleepState } from "../../sleep/components/SleepState";
import { TerrainGrid } from "../../terrain/components/TerrainGrid";
import { Velocity } from "../../shared/components/Velocity";

export class MovementSystem implements System {
  update(world: World, deltaSeconds: number): void {
    const grid = world.query(TerrainGrid)[0]?.[1];
    const mud = world.query(MudWorld)[0]?.[1];

    for (const [entity, position, velocity, input] of world.query(
      Position,
      Velocity,
      InputState,
    )) {
      const sleep = world.query(SleepState)[0]?.[1];

      if (sleep?.active) {
        velocity.x = 0;
        velocity.y = 0;
        continue;
      }

      const movement = world.getComponent(entity, MovementState);
      const energy = world.getComponent(entity, Energy);

      if (world.getComponent(entity, FreeExploreMode)) {
        this.updateLocalMovement(position, velocity, input, deltaSeconds);
        continue;
      }

      if (grid && mud && movement && energy) {
        this.updateOnchainMovement(
          world,
          entity,
          position,
          velocity,
          input,
          movement,
          energy,
          grid,
          mud,
          deltaSeconds,
        );
        continue;
      }

      this.updateLocalMovement(position, velocity, input, deltaSeconds);
    }
  }

  private updateLocalMovement(
    position: Position,
    velocity: Velocity,
    input: InputState,
    deltaSeconds: number,
  ): void {
    const direction = chooseOrthogonalDirection(input.directionX, input.directionY);

    velocity.x = direction.x * velocity.maxSpeed;
    velocity.y = direction.y * velocity.maxSpeed;

    position.x += velocity.x * deltaSeconds;
    position.y += velocity.y * deltaSeconds;
  }

  private updateOnchainMovement(
    world: World,
    entity: Entity,
    position: Position,
    velocity: Velocity,
    input: InputState,
    movement: MovementState,
    energy: Energy,
    grid: TerrainGrid,
    mud: MudWorld,
    deltaSeconds: number,
  ): void {
    movement.confirmedTileX ??= Math.floor(position.x / grid.tileSize);
    movement.confirmedTileY ??= Math.floor(position.y / grid.tileSize);

    const direction = chooseOrthogonalDirection(input.directionX, input.directionY);

    if (direction.x === 0 && direction.y === 0) {
      velocity.x = 0;
      velocity.y = 0;

      if (movement.wasMoving) {
        movement.wasMoving = false;
        this.queueDropPointMove(world, entity, position, movement, grid);
      }

      this.submitQueuedMove(
        world,
        entity,
        position,
        velocity,
        movement,
        energy,
        grid,
        mud,
      );
      return;
    }

    movement.wasMoving = true;
    velocity.x = direction.x * velocity.maxSpeed;
    velocity.y = direction.y * velocity.maxSpeed;
    this.applyEnergyLimitedMovement(
      world,
      entity,
      position,
      velocity,
      movement,
      energy,
      grid,
      deltaSeconds,
    );
  }

  private applyEnergyLimitedMovement(
    world: World,
    entity: Entity,
    position: Position,
    velocity: Velocity,
    movement: MovementState,
    energy: Energy,
    grid: TerrainGrid,
    deltaSeconds: number,
  ): void {
    const confirmedTileX = movement.confirmedTileX;
    const confirmedTileY = movement.confirmedTileY;

    if (confirmedTileX === undefined || confirmedTileY === undefined) {
      position.x += velocity.x * deltaSeconds;
      position.y += velocity.y * deltaSeconds;
      return;
    }

    const nextX = position.x + velocity.x * deltaSeconds;
    const nextY = position.y + velocity.y * deltaSeconds;
    const nextTileX = clampTile(Math.floor(nextX / grid.tileSize), grid.width);
    const nextTileY = clampTile(Math.floor(nextY / grid.tileSize), grid.height);
    const reachableTiles = Math.floor(energy.current);
    const distance = manhattanDistance(
      confirmedTileX,
      confirmedTileY,
      nextTileX,
      nextTileY,
    );

    if (distance <= reachableTiles) {
      position.x = nextX;
      position.y = nextY;
      return;
    }

    const currentTileX = clampTile(Math.floor(position.x / grid.tileSize), grid.width);
    const currentTileY = clampTile(
      Math.floor(position.y / grid.tileSize),
      grid.height,
    );

    if (
      manhattanDistance(confirmedTileX, confirmedTileY, currentTileX, currentTileY) >=
      reachableTiles
    ) {
      velocity.x = 0;
      velocity.y = 0;
      updateActionLog(world, entity, "Move: not enough energy");
      return;
    }

    position.x = nextX;
    position.y = nextY;
  }

  private queueDropPointMove(
    world: World,
    entity: Entity,
    position: Position,
    movement: MovementState,
    grid: TerrainGrid,
  ): void {
    const targetTileX = clampTile(Math.floor(position.x / grid.tileSize), grid.width);
    const targetTileY = clampTile(Math.floor(position.y / grid.tileSize), grid.height);

    if (
      movement.confirmedTileX === targetTileX &&
      movement.confirmedTileY === targetTileY
    ) {
      movement.queuedTileX = undefined;
      movement.queuedTileY = undefined;
      return;
    }

    movement.queuedTileX = targetTileX;
    movement.queuedTileY = targetTileY;

    if (movement.pending) {
      updateActionLog(world, entity, `Move: queued ${targetTileX},${targetTileY}`);
    }
  }

  private submitQueuedMove(
    world: World,
    entity: Entity,
    position: Position,
    velocity: Velocity,
    movement: MovementState,
    energy: Energy,
    grid: TerrainGrid,
    mud: MudWorld,
  ): void {
    const previousTileX = movement.confirmedTileX;
    const previousTileY = movement.confirmedTileY;
    const targetTileX = movement.queuedTileX;
    const targetTileY = movement.queuedTileY;

    if (
      movement.pending ||
      previousTileX === undefined ||
      previousTileY === undefined ||
      targetTileX === undefined ||
      targetTileY === undefined
    ) {
      return;
    }

    if (previousTileX === targetTileX && previousTileY === targetTileY) {
      movement.queuedTileX = undefined;
      movement.queuedTileY = undefined;
      return;
    }

    const distance = manhattanDistance(
      previousTileX,
      previousTileY,
      targetTileX,
      targetTileY,
    );
    const earliestSubmitAtMs =
      movement.lastConfirmedAtMs +
      (distance / tilesPerSecond(velocity, grid)) * 1000;

    if (Date.now() < earliestSubmitAtMs) {
      return;
    }

    const energyCost = distance;

    if (energy.current < energyCost) {
      movement.queuedTileX = undefined;
      movement.queuedTileY = undefined;
      position.x = previousTileX * grid.tileSize + grid.tileSize / 2;
      position.y = previousTileY * grid.tileSize + grid.tileSize / 2;
      updateActionLog(world, entity, `Move: needs ${energyCost} energy`);
      return;
    }

    const path = buildOrthogonalPath(
      previousTileX,
      previousTileY,
      targetTileX,
      targetTileY,
    );

    movement.pending = true;
    movement.queuedTileX = undefined;
    movement.queuedTileY = undefined;
    const previousEnergy = energy.current;
    energy.current = Math.max(0, energy.current - energyCost);
    updateActionLog(
      world,
      entity,
      path.length > 1
        ? `Move: submitting path to ${targetTileX},${targetTileY}`
        : `Move: submitting ${targetTileX},${targetTileY}`,
    );

    const callbacks: MudMoveCallbacks = {
      onConfirmed: ({ x, y, playerEnergy }) => {
        movement.confirmedTileX = x;
        movement.confirmedTileY = y;
        movement.lastConfirmedAtMs = Date.now();
        movement.pending = false;
        if (playerEnergy) {
          energy.max = playerEnergy.maxEnergy;
          energy.current = playerEnergy.energy;
        }
        updateActionLog(world, entity, `Move: confirmed ${x},${y}`);
      },
      onRejected: (message) => {
        movement.pending = false;
        energy.current = previousEnergy;

        if (previousTileX !== undefined && previousTileY !== undefined) {
          const currentTileX = clampTile(
            Math.floor(position.x / grid.tileSize),
            grid.width,
          );
          const currentTileY = clampTile(
            Math.floor(position.y / grid.tileSize),
            grid.height,
          );
          const movedAfterSubmission =
            currentTileX !== targetTileX || currentTileY !== targetTileY;

          movement.confirmedTileX = previousTileX;
          movement.confirmedTileY = previousTileY;
          movement.lastConfirmedAtMs = Date.now();

          if (movedAfterSubmission) {
            movement.queuedTileX = currentTileX;
            movement.queuedTileY = currentTileY;
            updateActionLog(
              world,
              entity,
              `Move: ${message}; requeued ${currentTileX},${currentTileY}`,
            );
            return;
          }

          movement.queuedTileX = undefined;
          movement.queuedTileY = undefined;
          position.x = previousTileX * grid.tileSize + grid.tileSize / 2;
          position.y = previousTileY * grid.tileSize + grid.tileSize / 2;
        }

        updateActionLog(world, entity, `Move: ${message}`);
      },
    };
    const submitted =
      path.length > 1
        ? mud.bridge.submitMovePath(path, callbacks)
        : mud.bridge.submitMove(targetTileX, targetTileY, callbacks);

    if (!submitted) {
      movement.pending = false;
      movement.queuedTileX = targetTileX;
      movement.queuedTileY = targetTileY;
      energy.current = previousEnergy;
      updateActionLog(world, entity, "Move: waiting on previous move");
    }
  }
}

function buildOrthogonalPath(
  previousTileX: number | undefined,
  previousTileY: number | undefined,
  targetTileX: number,
  targetTileY: number,
): Array<{ x: number; y: number }> {
  if (previousTileX === undefined || previousTileY === undefined) {
    return [{ x: targetTileX, y: targetTileY }];
  }

  const xChanged = previousTileX !== targetTileX;
  const yChanged = previousTileY !== targetTileY;

  if (xChanged && yChanged) {
    return [
      { x: targetTileX, y: previousTileY },
      { x: targetTileX, y: targetTileY },
    ];
  }

  return [{ x: targetTileX, y: targetTileY }];
}

function chooseOrthogonalDirection(
  directionX: number,
  directionY: number,
): { x: number; y: number } {
  if (directionX === 0 && directionY === 0) {
    return { x: 0, y: 0 };
  }

  if (Math.abs(directionX) >= Math.abs(directionY)) {
    return { x: Math.sign(directionX), y: 0 };
  }

  return { x: 0, y: Math.sign(directionY) };
}

function clampTile(tile: number, size: number): number {
  return Math.max(0, Math.min(size - 1, tile));
}

function manhattanDistance(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): number {
  return Math.abs(toX - fromX) + Math.abs(toY - fromY);
}

function tilesPerSecond(velocity: Velocity, grid: TerrainGrid): number {
  return Math.max(0.1, velocity.maxSpeed / grid.tileSize);
}

function updateActionLog(world: World, entity: Entity, message: string): void {
  const log = world.getComponent(entity, ActionLog);

  if (log) {
    log.lastMessage = message;
  }
}
