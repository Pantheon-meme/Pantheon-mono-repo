import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { DayNightOverlay } from "../components/DayNightOverlay";
import { GameClock } from "../../time/components/GameClock";
import { ActionLog } from "../../actions/components/ActionLog";
import { JournalPanel } from "../components/JournalPanel";
import { BiomeMinimap } from "../components/BiomeMinimap";
import { hudColors } from "../HudTheme";

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

      overlay.label.setText(`Day ${clock.day}  ${timeLabel}`);
      overlay.phase.setText(lighting.phase);
      this.handleButtonClicks(world, overlay);
      const panelPosition = this.positionPanel(
        overlay,
        worldX,
        worldY,
        camera.width,
        scale,
      );
      overlay.panel.setStrokeStyle(1, phaseColor(lighting.phase), 0.68);
      overlay.label.setScale(scale);
      overlay.phase.setScale(scale);
      overlay.label.setVisible(true);
      overlay.phase.setVisible(true);
      overlay.panel.setVisible(true);

      overlay.buttons.forEach((button, index) => {
        const buttonX =
          panelPosition.x + (70 + index * 34) * scale;
        const buttonY = panelPosition.y + 48 * scale;
        const isActive = isButtonActive(world, button.id);

        button.background.setPosition(buttonX, buttonY);
        button.background.setScale(scale);
        button.background.setFillStyle(
          isActive ? hudColors.selected : hudColors.panel,
          isActive ? 0.94 : 0.9,
        );
        button.background.setStrokeStyle(
          1,
          isActive ? hudColors.selected : hudColors.border,
          isActive ? 0.9 : 0.45,
        );
        button.label.setPosition(buttonX, buttonY);
        button.label.setScale(scale);
        button.label.setColor(isActive ? hudColors.textDark : hudColors.textWarm);
        button.background.setVisible(true);
        button.label.setVisible(true);
      });
    }
  }

  private positionPanel(
    overlay: DayNightOverlay,
    worldX: number,
    worldY: number,
    cameraWidth: number,
    scale: number,
  ): { x: number; y: number } {
    const panelX = worldX + (cameraWidth - overlay.screenX - 172) * scale;
    const panelY = worldY + overlay.screenY * scale;

    overlay.panel.setPosition(panelX, panelY);
    overlay.panel.setScale(scale);
    overlay.label.setPosition(panelX + 14 * scale, panelY + 11 * scale);
    overlay.phase.setPosition(panelX + 158 * scale, panelY + 31 * scale);

    return { x: panelX, y: panelY };
  }

  private handleButtonClicks(world: World, overlay: DayNightOverlay): void {
    const log = world.query(ActionLog)[0]?.[1];

    for (const button of overlay.buttons) {
      if (!button.pendingClick) {
        continue;
      }

      button.pendingClick = false;

      if (button.id === "journal") {
        const panel = world.query(JournalPanel)[0]?.[1];

        if (panel) {
          panel.visible = !panel.visible;
        }
        continue;
      }

      if (button.id === "map") {
        const minimap = world.query(BiomeMinimap)[0]?.[1];

        if (minimap) {
          minimap.visible = !minimap.visible;
          log &&
            (log.lastMessage = minimap.visible
              ? "Map: minimap shown"
              : "Map: minimap hidden");
        }
        continue;
      }

      log && (log.lastMessage = "Settings: not available yet");
    }
  }
}

function isButtonActive(world: World, buttonId: string): boolean {
  if (buttonId === "journal") {
    return Boolean(world.query(JournalPanel)[0]?.[1].visible);
  }

  if (buttonId === "map") {
    return Boolean(world.query(BiomeMinimap)[0]?.[1].visible);
  }

  return false;
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

function phaseColor(phase: string): number {
  switch (phase) {
    case "Dawn":
      return 0xf0c85a;
    case "Day":
      return 0xfff3a1;
    case "Dusk":
      return 0xd192ff;
    case "Night":
      return 0x7bd7ff;
    default:
      return hudColors.border;
  }
}
