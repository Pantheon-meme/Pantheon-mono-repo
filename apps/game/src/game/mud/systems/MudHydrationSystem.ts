import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { ActionLog } from "../../actions/components/ActionLog";
import { Energy } from "../../energy/components/Energy";
import { FreeExploreMode } from "../../player/components/FreeExploreMode";
import { InputState } from "../../player/components/InputState";
import { PlayerControlled } from "../../player/components/PlayerControlled";
import { MovementState } from "../../player/components/MovementState";
import { Position } from "../../shared/components/Position";
import { TerrainGrid } from "../../terrain/components/TerrainGrid";
import { MudWorld } from "../components/MudWorld";
import type { PlayerSnapshot } from "../MudWorldBridge";

export class MudHydrationSystem implements System {
  private requested = false;
  private hydrated = false;
  private missingLogged = false;
  private retryInSeconds = 0;
  private pollInSeconds = 0;
  private lastSnapshotKey?: string;

  constructor(private readonly pollIntervalSeconds = 1) {}

  update(world: World, deltaSeconds: number): void {
    if (this.requested) {
      return;
    }

    this.retryInSeconds = Math.max(0, this.retryInSeconds - deltaSeconds);
    this.pollInSeconds = Math.max(0, this.pollInSeconds - deltaSeconds);

    if (this.retryInSeconds > 0) {
      return;
    }

    if (this.hydrated && this.pollInSeconds > 0) {
      return;
    }

    const mud = world.query(MudWorld)[0]?.[1];
    const grid = world.query(TerrainGrid)[0]?.[1];
    const player = world.query(
      PlayerControlled,
      Position,
      Energy,
      MovementState,
    )[0];

    if (!mud || !grid || !player) {
      return;
    }

    const [entity, , position, energy, movement] = player;
    const input = world.getComponent(entity, InputState);

    if (world.getComponent(entity, FreeExploreMode)) {
      if (!this.hydrated) {
        this.hydrated = true;
        this.writeLog(world, entity, "Explore: local movement enabled");
      }
      return;
    }

    this.requested = true;

    void mud.bridge
      .readPlayerSnapshot()
      .then((snapshot) => {
        if (!snapshot) {
          this.retryInSeconds = 2;

          if (!this.missingLogged) {
            this.missingLogged = true;
            this.writeLog(world, entity, "MUD: no spawned player found");
          }

          return;
        }

        this.applySnapshot(
          world,
          entity,
          position,
          energy,
          movement,
          input,
          grid,
          snapshot,
        );
        this.pollInSeconds = this.pollIntervalSeconds;
      })
      .catch((error: unknown) => {
        this.retryInSeconds = 2;
        this.writeLog(world, entity, `MUD: sync failed (${formatError(error)})`);
      })
      .finally(() => {
        this.requested = false;
      });
  }

  private applySnapshot(
    world: World,
    entity: number,
    position: Position,
    energy: Energy,
    movement: MovementState,
    input: InputState | undefined,
    grid: TerrainGrid,
    snapshot: PlayerSnapshot,
  ): void {
    const snapshotKey = [
      snapshot.x,
      snapshot.y,
      snapshot.energy,
      snapshot.maxEnergy,
      snapshot.lastMoveAt,
      snapshot.actionLog?.updatedAt ?? 0,
    ].join(":");
    const changed = snapshotKey !== this.lastSnapshotKey;
    const localMoveInFlight =
      movement.pending ||
      movement.queuedTileX !== undefined ||
      movement.queuedTileY !== undefined ||
      (input?.directionX ?? 0) !== 0 ||
      (input?.directionY ?? 0) !== 0 ||
      movement.wasMoving;

    energy.current = snapshot.energy;
    energy.max = snapshot.maxEnergy;

    if (!localMoveInFlight) {
      position.x = snapshot.x * grid.tileSize + grid.tileSize / 2;
      position.y = snapshot.y * grid.tileSize + grid.tileSize / 2;
      movement.confirmedTileX = snapshot.x;
      movement.confirmedTileY = snapshot.y;
      movement.queuedTileX = undefined;
      movement.queuedTileY = undefined;
      movement.lastConfirmedAtMs = snapshot.lastMoveAt * 1000;
      movement.pending = false;
      movement.wasMoving = false;
    }

    if (!this.hydrated) {
      this.hydrated = true;
      this.writeLog(
        world,
        entity,
        snapshot.actionLog?.message ||
          `MUD: loaded player ${snapshot.x},${snapshot.y}`,
      );
    } else if (changed && !localMoveInFlight) {
      this.writeLog(
        world,
        entity,
        snapshot.actionLog?.message ||
          `MUD: synced player ${snapshot.x},${snapshot.y}`,
      );
    } else if (changed) {
      this.writeLog(world, entity, "MUD: external update pending local movement");
    }

    this.lastSnapshotKey = snapshotKey;
  }

  private writeLog(world: World, entity: number, message: string): void {
    const log = world.getComponent(entity, ActionLog);

    if (log) {
      log.lastMessage = message;
    }
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "unavailable";
}
