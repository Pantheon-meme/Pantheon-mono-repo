import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { DayNightOverlay } from "../components/DayNightOverlay";
import { GameClock } from "../../time/components/GameClock";
import { ActionLog } from "../../actions/components/ActionLog";
import { JournalPanel } from "../components/JournalPanel";
import { BiomeMinimap } from "../components/BiomeMinimap";

type Lighting = {
  alpha: number;
  color: number;
  phase: string;
};

const artworkPanelUnderlap = 18;

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
        `Day ${clock.day}  |  ${timeLabel}  |  ${lighting.phase}`,
      );
      overlay.artwork.setRotation(clock.normalizedDayTime * Math.PI * 2);
      this.handleButtonClicks(world, overlay);
      this.positionOverlay(
        overlay,
        worldX,
        worldY,
        camera.width,
        camera.height,
        scale,
      );
      overlay.container.setVisible(true);
      overlay.buttonsContainer.setVisible(true);

      overlay.buttons.forEach((button) => {
        const isActive = isButtonActive(world, button.id);
        const showActive = isActive || button.pressed;

        button.active.setVisible(showActive);
        button.inactive.setVisible(!showActive);
      });
    }
  }

  private positionOverlay(
    overlay: DayNightOverlay,
    worldX: number,
    worldY: number,
    cameraWidth: number,
    cameraHeight: number,
    scale: number,
  ): void {
    const heightBudget =
      cameraHeight -
      overlay.screenY * 2 -
      overlay.buttonGapY -
      overlay.buttonRowHeight;
    const responsiveScale = Math.min(
      overlay.displayScale,
      (cameraWidth - overlay.screenX * 2) / overlay.width,
      heightBudget / overlay.height,
    );
    const clampedScale = Math.max(0.32, responsiveScale);
    const overlayScreenWidth = overlay.width * clampedScale;
    const overlayScreenHeight = overlay.height * clampedScale;
    const overlayScreenX = cameraWidth - overlay.screenX - overlayScreenWidth;
    const overlayScreenY = overlay.screenY;
    const buttonsScreenX =
      overlayScreenX + (overlayScreenWidth - overlay.buttonRowWidth) / 2;
    const buttonsScreenY =
      overlayScreenY + overlayScreenHeight + overlay.buttonGapY;

    overlay.container.setPosition(
      worldX + overlayScreenX * scale,
      worldY + overlayScreenY * scale,
    );
    overlay.container.setScale(scale * clampedScale);
    overlay.artworkMask.clear();
    overlay.artworkMask
      .fillStyle(0xffffff, 1)
      .fillRect(
        worldX + overlayScreenX * scale,
        worldY + overlayScreenY * scale,
        overlayScreenWidth * scale,
        (overlay.panelY + artworkPanelUnderlap) * clampedScale * scale,
      );
    overlay.buttonsContainer.setPosition(
      worldX + buttonsScreenX * scale,
      worldY + buttonsScreenY * scale,
    );
    overlay.buttonsContainer.setScale(scale);
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
