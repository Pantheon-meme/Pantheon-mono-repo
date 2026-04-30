import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { ActionLog } from "../../actions/components/ActionLog";
import { Energy } from "../../energy/components/Energy";
import { FreeExploreMode } from "../../player/components/FreeExploreMode";
import { PlayerControlled } from "../../player/components/PlayerControlled";
import { MovementState } from "../../player/components/MovementState";
import { Position } from "../../shared/components/Position";
import { TerrainGrid } from "../../terrain/components/TerrainGrid";
import { MudWorld } from "../components/MudWorld";

export class MudHydrationSystem implements System {
  private requested = false;
  private completed = false;
  private missingLogged = false;
  private retryInSeconds = 0;

  update(world: World, deltaSeconds: number): void {
    if (this.requested || this.completed) {
      return;
    }

    this.retryInSeconds = Math.max(0, this.retryInSeconds - deltaSeconds);

    if (this.retryInSeconds > 0) {
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

    if (world.getComponent(entity, FreeExploreMode)) {
      this.completed = true;
      this.writeLog(world, entity, "Explore: local movement enabled");
      return;
    }

    this.requested = true;

    void mud.bridge.readPlayerSnapshot().then((snapshot) => {
      this.requested = false;

      if (!snapshot) {
        this.retryInSeconds = 2;

        if (!this.missingLogged) {
          this.missingLogged = true;
          this.writeLog(world, entity, "MUD: no spawned player found");
        }

        return;
      }

      position.x = snapshot.x * grid.tileSize + grid.tileSize / 2;
      position.y = snapshot.y * grid.tileSize + grid.tileSize / 2;
      energy.current = snapshot.energy;
      energy.max = snapshot.maxEnergy;
      movement.confirmedTileX = snapshot.x;
      movement.confirmedTileY = snapshot.y;
      movement.queuedTileX = undefined;
      movement.queuedTileY = undefined;
      movement.lastConfirmedAtMs = snapshot.lastMoveAt * 1000;
      movement.pending = false;
      movement.wasMoving = false;
      this.completed = true;
      this.writeLog(world, entity, `MUD: loaded player ${snapshot.x},${snapshot.y}`);
    });
  }

  private writeLog(world: World, entity: number, message: string): void {
    const log = world.getComponent(entity, ActionLog);

    if (log) {
      log.lastMessage = message;
    }
  }
}
