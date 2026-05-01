import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { ActionLog } from "../../actions/components/ActionLog";
import { Energy } from "../../energy/components/Energy";
import { OnchainPresentation } from "../components/OnchainPresentation";
import { getMudActionDurationSeconds } from "../ActionDurations";
import { FreeExploreMode } from "../../player/components/FreeExploreMode";
import { InputState } from "../../player/components/InputState";
import { PlayerControlled } from "../../player/components/PlayerControlled";
import { MovementState } from "../../player/components/MovementState";
import { Position } from "../../shared/components/Position";
import { TerrainGrid } from "../../terrain/components/TerrainGrid";
import { MudWorld } from "../components/MudWorld";
import { OnchainWorldHydrator } from "../OnchainWorldHydrator";
import type { PlayerSnapshot } from "../MudWorldTypes";

const worldStateHydrationRadius = 32;

export class MudHydrationSystem implements System {
  private requested = false;
  private hydrated = false;
  private missingLogged = false;
  private retryInSeconds = 0;
  private pollInSeconds = 0;
  private lastSnapshotKey?: string;
  private lastPresentedActionAt = 0;
  private lastPresentedPendingActionReadyAt = 0;
  private readonly worldHydrator = new OnchainWorldHydrator();

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
      .readPlayerSnapshot(
        this.hydrated
          ? undefined
          : {
              width: grid.width,
              height: grid.height,
              radius: worldStateHydrationRadius,
            },
      )
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

    if (
      !this.hydrated ||
      (!localMoveInFlight && !energy.hasPendingOptimisticDelta)
    ) {
      energy.setConfirmed(
        snapshot.energy,
        snapshot.maxEnergy,
        snapshot.actionLog?.updatedAt ?? 0,
      );
    }
    this.worldHydrator.apply(world, grid, snapshot);
    this.applyOnchainPresentation(world, entity, snapshot);

    if (!this.hydrated) {
      position.x = snapshot.x * grid.tileSize + grid.tileSize / 2;
      position.y = snapshot.y * grid.tileSize + grid.tileSize / 2;
      movement.confirmedTileX = snapshot.x;
      movement.confirmedTileY = snapshot.y;
      movement.queuedTileX = undefined;
      movement.queuedTileY = undefined;
      movement.externalTargetTileX = undefined;
      movement.externalTargetTileY = undefined;
      movement.lastConfirmedAtMs = snapshot.lastMoveAt * 1000;
      movement.pending = false;
      movement.wasMoving = false;
    } else if (!localMoveInFlight) {
      this.applyExternalMovement(movement, snapshot);
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

  private applyExternalMovement(
    movement: MovementState,
    snapshot: PlayerSnapshot,
  ): void {
    if (
      movement.confirmedTileX === snapshot.x &&
      movement.confirmedTileY === snapshot.y
    ) {
      return;
    }

    movement.externalTargetTileX = snapshot.x;
    movement.externalTargetTileY = snapshot.y;
    movement.queuedTileX = undefined;
    movement.queuedTileY = undefined;
    movement.pending = false;
    movement.wasMoving = false;
  }

  private applyOnchainPresentation(
    world: World,
    entity: number,
    snapshot: PlayerSnapshot,
  ): void {
    let presentation = world.getComponent(entity, OnchainPresentation);

    if (!presentation) {
      presentation = new OnchainPresentation();
      world.addComponent(entity, OnchainPresentation, presentation);
    }

    if (snapshot.pendingAction) {
      if (
        snapshot.pendingAction.readyAt !== this.lastPresentedPendingActionReadyAt
      ) {
        this.lastPresentedPendingActionReadyAt = snapshot.pendingAction.readyAt;
        presentation.start(
          snapshot.pendingAction.action === "sleep" ? "sleep" : "action",
          Math.max(
            0.1,
            snapshot.pendingAction.readyAt - Date.now() / 1000,
          ),
        );
      }
      return;
    }

    presentation.clear();

    const action = snapshot.actionLog?.action;
    const updatedAt = snapshot.actionLog?.updatedAt ?? 0;

    if (updatedAt <= this.lastPresentedActionAt || !action) {
      return;
    }

    this.lastPresentedActionAt = updatedAt;

    if (
      action === "forage" ||
      action === "dig" ||
      action === "plant" ||
      action === "harvest" ||
      action === "water" ||
      action === "tend"
    ) {
      presentation.start("action", getMudActionDurationSeconds(action));
      return;
    }

    if (action === "sleep") {
      presentation.start("sleep", getMudActionDurationSeconds(action));
    }
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
