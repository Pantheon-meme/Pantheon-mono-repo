import type { System } from "../../../ecs/System";
import type { Entity } from "../../../ecs/World";
import type { World } from "../../../ecs/World";
import { ActionLog } from "../../actions/components/ActionLog";
import { MudWorld } from "../../mud/components/MudWorld";
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

      if (grid && mud && movement) {
        this.updateOnchainMovement(
          world,
          entity,
          position,
          velocity,
          input,
          movement,
          grid,
          mud,
          deltaSeconds,
        );
        continue;
      }

      const direction = chooseOrthogonalDirection(input.directionX, input.directionY);

      velocity.x = direction.x * velocity.maxSpeed;
      velocity.y = direction.y * velocity.maxSpeed;

      position.x += velocity.x * deltaSeconds;
      position.y += velocity.y * deltaSeconds;
    }
  }

  private updateOnchainMovement(
    world: World,
    entity: Entity,
    position: Position,
    velocity: Velocity,
    input: InputState,
    movement: MovementState,
    grid: TerrainGrid,
    mud: MudWorld,
    deltaSeconds: number,
  ): void {
    movement.confirmedTileX ??= Math.floor(position.x / grid.tileSize);
    movement.confirmedTileY ??= Math.floor(position.y / grid.tileSize);

    if (movement.pending) {
      velocity.x = 0;
      velocity.y = 0;
      return;
    }

    const direction = chooseOrthogonalDirection(input.directionX, input.directionY);

    if (direction.x === 0 && direction.y === 0) {
      velocity.x = 0;
      velocity.y = 0;
      if (movement.wasMoving) {
        movement.wasMoving = false;
        this.submitDropPointMove(world, entity, position, movement, grid, mud);
      }
      return;
    }

    movement.wasMoving = true;
    velocity.x = direction.x * velocity.maxSpeed;
    velocity.y = direction.y * velocity.maxSpeed;
    position.x += velocity.x * deltaSeconds;
    position.y += velocity.y * deltaSeconds;
  }

  private submitDropPointMove(
    world: World,
    entity: Entity,
    position: Position,
    movement: MovementState,
    grid: TerrainGrid,
    mud: MudWorld,
  ): void {
    const previousTileX = movement.confirmedTileX;
    const previousTileY = movement.confirmedTileY;
    const targetTileX = clampTile(Math.floor(position.x / grid.tileSize), grid.width);
    const targetTileY = clampTile(Math.floor(position.y / grid.tileSize), grid.height);

    if (previousTileX === targetTileX && previousTileY === targetTileY) {
      return;
    }

    movement.pending = true;
    updateActionLog(world, entity, `Move: submitting ${targetTileX},${targetTileY}`);

    const submitted = mud.bridge.submitMove(targetTileX, targetTileY, {
      onConfirmed: ({ x, y }) => {
        movement.confirmedTileX = x;
        movement.confirmedTileY = y;
        movement.pending = false;
        updateActionLog(world, entity, `Move: confirmed ${x},${y}`);
      },
      onRejected: (message) => {
        movement.pending = false;

        if (previousTileX !== undefined && previousTileY !== undefined) {
          movement.confirmedTileX = previousTileX;
          movement.confirmedTileY = previousTileY;
          position.x = previousTileX * grid.tileSize + grid.tileSize / 2;
          position.y = previousTileY * grid.tileSize + grid.tileSize / 2;
        }

        updateActionLog(world, entity, `Move: ${message}`);
      },
    });

    if (!submitted) {
      movement.pending = false;
      updateActionLog(world, entity, "Move: waiting on previous move");

      if (previousTileX !== undefined && previousTileY !== undefined) {
        position.x = previousTileX * grid.tileSize + grid.tileSize / 2;
        position.y = previousTileY * grid.tileSize + grid.tileSize / 2;
      }
    }
  }
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

function updateActionLog(world: World, entity: Entity, message: string): void {
  const log = world.getComponent(entity, ActionLog);

  if (log) {
    log.lastMessage = message;
  }
}
