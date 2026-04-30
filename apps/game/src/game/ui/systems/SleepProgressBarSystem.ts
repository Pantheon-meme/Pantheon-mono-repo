import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { SleepProgressBar } from "../components/SleepProgressBar";
import { SleepState } from "../../sleep/components/SleepState";

export class SleepProgressBarSystem implements System {
  update(world: World): void {
    const sleep = world.query(SleepState)[0]?.[1];

    for (const [, bar] of world.query(SleepProgressBar)) {
      const camera = bar.background.scene.cameras.main;
      const scale = 1 / camera.zoom;
      const worldX = camera.worldView.x + bar.screenX * scale;
      const worldY = camera.worldView.y + bar.screenY * scale;

      bar.background.setPosition(worldX, worldY);
      bar.background.setScale(scale);
      bar.fill.setPosition(worldX, worldY);
      bar.fill.setScale(scale);
      bar.label.setPosition(worldX, worldY + (bar.height + 6) * scale);
      bar.label.setScale(scale);

      if (!sleep?.active) {
        bar.background.setVisible(false);
        bar.fill.setVisible(false);
        bar.label.setVisible(false);
        return;
      }

      const progress =
        sleep.durationSeconds === 0
          ? 0
          : sleep.elapsedSeconds / sleep.durationSeconds;
      const gainedEnergy = Math.floor(sleep.pendingEnergy);

      bar.fill.width = Math.max(0, bar.width * progress);
      bar.label.setText(
        `Sleeping on ${formatLayerName(sleep.terrainLayerId)}  +${gainedEnergy} energy`,
      );
      bar.background.setVisible(true);
      bar.fill.setVisible(true);
      bar.label.setVisible(true);
    }
  }
}

function formatLayerName(layerId: string): string {
  return layerId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
