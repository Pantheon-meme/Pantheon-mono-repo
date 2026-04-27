import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { DayNightOverlay } from "../components/DayNightOverlay";
import { GameClock } from "../../time/components/GameClock";

type Lighting = {
  alpha: number;
  color: number;
  phase: string;
};

export class DayNightRenderSystem implements System {
  update(world: World): void {
    const clock = world.query(GameClock)[0]?.[1];

    if (!clock) {
      return;
    }

    const lighting = getLighting(clock.normalizedDayTime);
    const timeLabel = formatClock(clock);

    for (const [, overlay] of world.query(DayNightOverlay)) {
      const camera = overlay.shade.scene.cameras.main;
      const scale = 1 / camera.zoom;
      const worldX = camera.worldView.x;
      const worldY = camera.worldView.y;

      overlay.shade.setPosition(worldX, worldY);
      overlay.shade.setDisplaySize(camera.width * scale, camera.height * scale);
      overlay.shade.setFillStyle(lighting.color, lighting.alpha);
      overlay.shade.setVisible(lighting.alpha > 0);

      overlay.label.setText(
        `Day ${clock.day}  ${timeLabel}\n${lighting.phase}`,
      );
      overlay.label.setPosition(
        worldX + (camera.width - overlay.screenX) * scale,
        worldY + overlay.screenY * scale,
      );
      overlay.label.setScale(scale);
      overlay.label.setVisible(true);
    }
  }
}

function getLighting(dayTime: number): Lighting {
  const hour = dayTime * 24;

  if (hour < 5) {
    return { alpha: 0.5, color: 0x07142a, phase: "Night" };
  }

  if (hour < 7) {
    return {
      alpha: lerp(0.5, 0.12, (hour - 5) / 2),
      color: 0x28324d,
      phase: "Dawn",
    };
  }

  if (hour < 17) {
    return { alpha: 0.02, color: 0xfff2c0, phase: "Day" };
  }

  if (hour < 20) {
    return {
      alpha: lerp(0.08, 0.48, (hour - 17) / 3),
      color: 0x2a183f,
      phase: "Dusk",
    };
  }

  return { alpha: 0.5, color: 0x07142a, phase: "Night" };
}

function formatClock(clock: GameClock): string {
  return `${clock.hour.toString().padStart(2, "0")}:${clock.minute
    .toString()
    .padStart(2, "0")}`;
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * Math.max(0, Math.min(1, progress));
}
