import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import {
  uiIconAssets,
  type UiIconAsset,
} from "../../../assets/ui/UiImageAssets";
import { ActionLog } from "../../actions/components/ActionLog";
import {
  hudColors,
  hudFontFamily,
  hudStatusColor,
  type HudStatus,
} from "../HudTheme";
import {
  ActionToastStack,
  type ActionToastCard,
} from "../components/ActionToastStack";

const toastHeight = 34;
const toastGap = 6;
const maxCards = 4;

export class ActionToastStackSystem implements System {
  update(world: World, deltaSeconds: number): void {
    const log = world.query(ActionLog)[0]?.[1];

    for (const [, stack] of world.query(ActionToastStack)) {
      this.positionStack(stack);

      if (log) {
        this.syncMessage(stack, log.lastMessage);
      }

      this.updateCards(stack, deltaSeconds);
    }
  }

  private syncMessage(stack: ActionToastStack, message: string): void {
    if (
      message === stack.lastMessage ||
      message.length === 0 ||
      message === "No action yet" ||
      /:\s*\d+%$/.test(message)
    ) {
      return;
    }

    stack.lastMessage = message;
    const card = this.createCard(stack, message, classifyMessage(message));
    stack.cards.unshift(card);

    while (stack.cards.length > maxCards) {
      stack.cards.pop()?.container.destroy(true);
    }
  }

  private createCard(
    stack: ActionToastStack,
    message: string,
    status: HudStatus,
  ): ActionToastCard {
    const scene = stack.container.scene;
    const container = scene.add.container(0, 0);
    const background = scene.add
      .rectangle(0, 0, stack.width, toastHeight, hudColors.panelDark, 0.9)
      .setOrigin(0)
      .setStrokeStyle(1, hudStatusColor(status), 0.62);
    const accent = scene.add
      .rectangle(0, 0, 4, toastHeight, hudStatusColor(status), 0.95)
      .setOrigin(0);
    const iconAsset = statusIcon(status);
    const icon = scene.add
      .image(15, toastHeight / 2, iconAsset.textureKey)
      .setDisplaySize(18, 18)
      .setAlpha(status === "default" ? 0.82 : 0.95)
      .setOrigin(0.5);
    const label = scene.add
      .text(32, 8, message, {
        color: hudColors.text,
        fixedWidth: stack.width - 42,
        fontFamily: hudFontFamily,
        fontSize: "13px",
        wordWrap: { width: stack.width - 44 },
      })
      .setOrigin(0);

    container.add([background, accent, icon, label]);
    stack.container.add(container);

    return {
      container,
      background,
      accent,
      icon,
      label,
      ageSeconds: 0,
      durationSeconds: status === "danger" ? 4.8 : 3.6,
      status,
    };
  }

  private updateCards(stack: ActionToastStack, deltaSeconds: number): void {
    for (let index = stack.cards.length - 1; index >= 0; index -= 1) {
      const card = stack.cards[index];

      card.ageSeconds += deltaSeconds;

      if (card.ageSeconds > card.durationSeconds) {
        stack.cards.splice(index, 1);
        card.container.destroy(true);
        continue;
      }

      const fadeStart = card.durationSeconds - 0.75;
      const fadeProgress =
        card.ageSeconds <= fadeStart
          ? 0
          : (card.ageSeconds - fadeStart) / Math.max(0.01, 0.75);
      const enterOffset = Math.max(0, 1 - card.ageSeconds / 0.18) * -12;

      card.container.setPosition(enterOffset, index * (toastHeight + toastGap));
      card.container.setAlpha(1 - fadeProgress);
      card.background.setStrokeStyle(1, hudStatusColor(card.status), 0.62);
      card.accent.setFillStyle(hudStatusColor(card.status), 0.95);
    }
  }

  private positionStack(stack: ActionToastStack): void {
    const camera = stack.container.scene.cameras.main;
    const scale = 1 / camera.zoom;
    const worldX = camera.worldView.x + stack.screenX * scale;
    const worldY = camera.worldView.y + stack.screenY * scale;

    stack.container.setPosition(worldX, worldY);
    stack.container.setScale(scale);
  }
}

function classifyMessage(message: string): HudStatus {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("rejected") ||
    normalized.includes("fizzled") ||
    normalized.includes("unknown")
  ) {
    return "danger";
  }

  if (
    normalized.includes("need") ||
    normalized.includes("not enough") ||
    normalized.includes("no effect") ||
    normalized.includes("unavailable")
  ) {
    return "warning";
  }

  if (
    normalized.includes("waiting") ||
    normalized.includes("queued") ||
    normalized.includes("submitting") ||
    normalized.includes("started")
  ) {
    return "pending";
  }

  if (normalized.includes("confirmed") || normalized.includes("shook loose")) {
    return "success";
  }

  return "default";
}

function statusIcon(status: HudStatus): UiIconAsset {
  switch (status) {
    case "success":
      return uiIconAssets.success;
    case "warning":
    case "danger":
      return uiIconAssets.errorFail;
    case "pending":
      return uiIconAssets.pending;
    case "disabled":
    case "default":
      return uiIconAssets.gather;
  }
}
