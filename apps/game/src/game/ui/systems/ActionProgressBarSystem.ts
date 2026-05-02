import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import {
  actionProgressFinalStatusIconAsset,
  actionProgressFinalStatusIconTextureKey,
  uiIconAssets,
  type UiIconAsset,
} from "../../../assets/ui/UiImageAssets";
import {
  ActionProgress,
  type ActionProgressFinalStatus,
} from "../../actions/components/ActionProgress";
import { Position } from "../../shared/components/Position";
import { ActionProgressBar } from "../components/ActionProgressBar";

const actionIconDisplaySize = 62;
const finalStatusDurationSeconds = 0.66;
const finalStatusFadeStartSeconds = 0.46;
const finalStatusPopSeconds = 0.22;
const failureStatusIconDisplaySize = 69;

export class ActionProgressBarSystem implements System {
  update(world: World, deltaSeconds: number): void {
    for (const [, position, progress, bar] of world.query(
      Position,
      ActionProgress,
      ActionProgressBar,
    )) {
      positionBar(bar, position);

      if (progress.active) {
        updateActiveProgress(bar, progress);
        continue;
      }

      if (progress.finalStatus) {
        updateFinalStatus(bar, progress, deltaSeconds);
        continue;
      }

      bar.finalAnimationKey = undefined;
      bar.finalAnimationElapsedSeconds = 0;
      bar.container.setAlpha(1);
      bar.finalStatusIcon.setVisible(false);
      bar.container.setVisible(false);
    }
  }
}

function positionBar(bar: ActionProgressBar, position: Position): void {
  const camera = bar.container.scene.cameras.main;
  const scale = 1 / camera.zoom;

  bar.container.setPosition(position.x, position.y + bar.offsetY * scale);
  bar.container.setScale(scale);
}

function updateActiveProgress(
  bar: ActionProgressBar,
  progress: ActionProgress,
): void {
  bar.finalAnimationKey = undefined;
  bar.finalAnimationElapsedSeconds = 0;
  bar.container.setAlpha(1);
  bar.finalStatusIcon.setVisible(false);
  applyFillWidth(bar, bar.fillFullWidth * progress.ratio);
  bar.icon
    .setTexture(iconForAction(progress.actionId ?? progress.label).textureKey)
    .setDisplaySize(actionIconDisplaySize, actionIconDisplaySize);
  bar.container.setVisible(true);
}

function updateFinalStatus(
  bar: ActionProgressBar,
  progress: ActionProgress,
  deltaSeconds: number,
): void {
  const finalStatus = progress.finalStatus;

  if (!finalStatus) {
    return;
  }

  const animationKey = [
    finalStatus,
    progress.finalActionId ?? "",
    progress.finalLabel,
  ].join(":");

  if (bar.finalAnimationKey !== animationKey) {
    bar.finalAnimationKey = animationKey;
    bar.finalAnimationElapsedSeconds = 0;
  }

  bar.finalAnimationElapsedSeconds += deltaSeconds;

  if (bar.finalAnimationElapsedSeconds >= finalStatusDurationSeconds) {
    progress.clearFinalStatus();
    bar.finalAnimationKey = undefined;
    bar.finalAnimationElapsedSeconds = 0;
    bar.container.setAlpha(1);
    bar.finalStatusIcon.setVisible(false);
    bar.container.setVisible(false);
    return;
  }

  const fadeProgress = clamp(
    (bar.finalAnimationElapsedSeconds - finalStatusFadeStartSeconds) /
      (finalStatusDurationSeconds - finalStatusFadeStartSeconds),
    0,
    1,
  );
  const popProgress = clamp(
    bar.finalAnimationElapsedSeconds / finalStatusPopSeconds,
    0,
    1,
  );
  const popScale = 0.62 + easeOutBack(popProgress) * 0.38;
  const alpha = 1 - easeInCubic(fadeProgress);
  const statusSize = finalStatusIconDisplaySize(finalStatus);

  applyFillWidth(bar, bar.fillFullWidth);
  bar.icon
    .setTexture(
      iconForAction(progress.finalActionId ?? progress.finalLabel).textureKey,
    )
    .setDisplaySize(actionIconDisplaySize, actionIconDisplaySize);
  bar.finalStatusIcon
    .setTexture(finalStatusIconTextureKey(finalStatus))
    .setDisplaySize(statusSize.width * popScale, statusSize.height * popScale)
    .setAlpha(1)
    .setVisible(true);
  bar.container.setAlpha(alpha);
  bar.container.setVisible(true);
}

function applyFillWidth(bar: ActionProgressBar, fillWidth: number): void {
  const clampedWidth = clamp(fillWidth, 0, bar.fillFullWidth);

  bar.fill.setVisible(clampedWidth > 0);

  if (clampedWidth > 0) {
    bar.fill.setSize(clampedWidth, bar.fillHeight);
    bar.fill.setPosition(bar.fillX, bar.fillY);
  }
}

function finalStatusIconTextureKey(status: ActionProgressFinalStatus): string {
  return status === "success"
    ? actionProgressFinalStatusIconTextureKey
    : uiIconAssets.errorFail.textureKey;
}

function finalStatusIconDisplaySize(status: ActionProgressFinalStatus): {
  width: number;
  height: number;
} {
  return status === "success"
    ? {
        width: actionProgressFinalStatusIconAsset.width,
        height: actionProgressFinalStatusIconAsset.height,
      }
    : {
        width: failureStatusIconDisplaySize,
        height: failureStatusIconDisplaySize,
      };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function easeInCubic(progress: number): number {
  return progress ** 3;
}

function easeOutBack(progress: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;

  return 1 + c3 * (progress - 1) ** 3 + c1 * (progress - 1) ** 2;
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

  if (normalized.includes("grab")) {
    return uiIconAssets.grab;
  }

  if (normalized.includes("drop")) {
    return uiIconAssets.drop;
  }

  if (normalized.includes("hand")) {
    return uiIconAssets.hands;
  }

  return uiIconAssets.gather;
}
