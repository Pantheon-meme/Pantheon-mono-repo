import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { MudWorld } from "../../mud/components/MudWorld";
import { GameClock } from "../components/GameClock";

export class GameClockSystem implements System {
  private syncRequested = false;
  private synced = false;
  private retryInSeconds = 0;

  update(world: World, deltaSeconds: number): void {
    this.syncFromMud(world, deltaSeconds);

    for (const [, clock] of world.query(GameClock)) {
      clock.sync();
    }
  }

  private syncFromMud(world: World, deltaSeconds: number): void {
    if (this.synced || this.syncRequested) {
      return;
    }

    this.retryInSeconds = Math.max(0, this.retryInSeconds - deltaSeconds);

    if (this.retryInSeconds > 0) {
      return;
    }

    const clock = world.query(GameClock)[0]?.[1];
    const mud = world.query(MudWorld)[0]?.[1];

    if (!clock || !mud) {
      return;
    }

    this.syncRequested = true;
    void mud.bridge.readWorldTime().then((worldTime) => {
      this.syncRequested = false;

      if (!worldTime) {
        this.retryInSeconds = 2;
        return;
      }

      clock.configure(worldTime.startedAt, worldTime.dayLength);
      this.synced = true;
    });
  }
}
