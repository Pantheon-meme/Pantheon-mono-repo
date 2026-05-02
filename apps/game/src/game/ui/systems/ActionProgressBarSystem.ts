import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import {
  uiIconAssets,
  type UiIconAsset,
} from "../../../assets/ui/UiImageAssets";
import { ActionProgress } from "../../actions/components/ActionProgress";
import { Position } from "../../shared/components/Position";
import { hudColors } from "../HudTheme";
import { ActionProgressBar } from "../components/ActionProgressBar";

const actionIconDisplaySize = 24;

export class ActionProgressBarSystem implements System {
  update(world: World): void {
    for (const [, position, progress, bar] of world.query(
      Position,
      ActionProgress,
      ActionProgressBar,
    )) {
      if (!progress.active) {
        bar.container.setVisible(false);
        continue;
      }

      const camera = bar.container.scene.cameras.main;
      const scale = 1 / camera.zoom;
      const fillWidth = Math.max(0, bar.width * progress.ratio);

      bar.container.setPosition(position.x, position.y + bar.offsetY * scale);
      bar.container.setScale(scale);
      bar.fill.width = fillWidth;
      bar.fill.setPosition(-bar.width / 2, 10);
      bar.label.setText(progress.label);
      bar.icon
        .setTexture(iconForAction(progress.actionId ?? progress.label).textureKey)
        .setDisplaySize(actionIconDisplaySize, actionIconDisplaySize);
      bar.detail.setText(`${Math.round(progress.ratio * 100)}%`);
      bar.panel.setStrokeStyle(1, hudColors.borderWarm, 0.72);
      bar.container.setVisible(true);
    }
  }
}

function iconForAction(actionId: string): UiIconAsset {
  const normalized = actionId.toLowerCase();

  if (normalized.includes("sleep") || normalized.includes("rest")) {
    return uiIconAssets.sleepPillow;
  }

  if (normalized.includes("forage")) {
    return uiIconAssets.forage;
  }

  if (normalized.includes("plant")) {
    return uiIconAssets.plant;
  }

  if (normalized.includes("dig")) {
    return uiIconAssets.diggingTool;
  }

  if (normalized.includes("fetch")) {
    return uiIconAssets.harvest;
  }

  return uiIconAssets.gather;
}
