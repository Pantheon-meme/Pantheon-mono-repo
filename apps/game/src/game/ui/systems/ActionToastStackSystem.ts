import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import {
  toastCardKindIconAssets,
  toastCardPanelAsset,
  toastCardPanelSlices,
  toastCardPanelTextureKey,
  toastCardStatusIconAssets,
  type ToastCardKindIconAsset,
  type ToastCardStatusIconAsset,
} from "../../../assets/ui/UiImageAssets";
import { ActionLog } from "../../actions/components/ActionLog";
import type { HudStatus } from "../HudTheme";
import {
  ActionToastStack,
  type ActionToastCard,
} from "../components/ActionToastStack";

const toastDisplayHeight = 42;
const toastGap = 4;
const maxCards = 4;
const toastCardScale = toastDisplayHeight / toastCardPanelAsset.height;
const toastKindIconX = 116;
const toastKindIconDisplayHeight = 88;
const toastLabelX = 174;
const toastStatusRightInset = 92;
const toastStatusIconDisplayHeight = 66;
const toastLabelStatusGap = 26;
const toastFontFamily = "Trebuchet MS, Verdana, system-ui, sans-serif";

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
    const panelWidth = Math.round(stack.width / toastCardScale);
    const statusX = panelWidth - toastStatusRightInset;
    const labelWidth = Math.max(
      220,
      statusX - toastStatusIconDisplayHeight - toastLabelStatusGap - toastLabelX,
    );
    const background = scene.add
      .nineslice(
        0,
        0,
        toastCardPanelTextureKey,
        undefined,
        panelWidth,
        toastCardPanelAsset.height,
        toastCardPanelSlices.left,
        toastCardPanelSlices.right,
        toastCardPanelSlices.top,
        toastCardPanelSlices.bottom,
      )
      .setOrigin(0)
      .setAlpha(0.98);
    const kindIconAsset = kindIconForMessage(message, status);
    const kindIconImage = scene.add
      .image(
        toastKindIconX,
        toastCardPanelAsset.height / 2,
        kindIconAsset.textureKey,
      )
      .setDisplaySize(
        fittedWidth(kindIconAsset, toastKindIconDisplayHeight),
        toastKindIconDisplayHeight,
      )
      .setOrigin(0.5);
    const statusIconAsset = statusIconForStatus(status);
    const statusIconImage = scene.add
      .image(
        statusX,
        toastCardPanelAsset.height / 2,
        statusIconAsset.textureKey,
      )
      .setDisplaySize(
        fittedWidth(statusIconAsset, toastStatusIconDisplayHeight),
        toastStatusIconDisplayHeight,
      )
      .setAlpha(status === "default" ? 0.88 : 0.97)
      .setOrigin(0.5);
    const label = scene.add
      .text(toastLabelX, toastCardPanelAsset.height / 2 + 1, message, {
        color: "#201309",
        fixedHeight: 48,
        fixedWidth: labelWidth,
        fontFamily: toastFontFamily,
        fontSize: "38px",
        fontStyle: "700",
        maxLines: 1,
        shadow: {
          color: "#f7e8c4",
          fill: true,
          offsetX: 0,
          offsetY: 2,
        },
        stroke: "#f4dfb2",
        strokeThickness: 2,
        wordWrap: { width: labelWidth, useAdvancedWrap: true },
      })
      .setOrigin(0, 0.5)
      .setResolution(2);

    container.setScale(toastCardScale);
    container.add([background, kindIconImage, label, statusIconImage]);
    stack.container.add(container);

    return {
      container,
      background,
      kindIcon: kindIconImage,
      statusIcon: statusIconImage,
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

      card.container.setPosition(
        enterOffset,
        index * (toastDisplayHeight + toastGap),
      );
      card.container.setAlpha(1 - fadeProgress);
      card.statusIcon.setAlpha(
        card.status === "pending"
          ? 0.78 + Math.sin(card.ageSeconds * 8) * 0.14
          : card.status === "default"
            ? 0.88
            : 0.97,
      );
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

function fittedWidth(
  asset: ToastCardKindIconAsset | ToastCardStatusIconAsset,
  displayHeight: number,
): number {
  return displayHeight * (asset.width / asset.height);
}

function kindIconForMessage(
  message: string,
  status: HudStatus,
): ToastCardKindIconAsset {
  const normalized = message.toLowerCase();

  if (
    normalized.startsWith("region:") ||
    normalized.startsWith("settings:") ||
    normalized.includes("sync")
  ) {
    return toastCardKindIconAssets.system;
  }

  if (
    status === "success" ||
    normalized.includes("found") ||
    normalized.includes("entered") ||
    normalized.includes("shook loose")
  ) {
    return toastCardKindIconAssets.star;
  }

  return toastCardKindIconAssets.message;
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

function statusIconForStatus(status: HudStatus): ToastCardStatusIconAsset {
  switch (status) {
    case "success":
    case "default":
      return toastCardStatusIconAssets.success;
    case "danger":
      return toastCardStatusIconAssets.errorFail;
    case "warning":
    case "disabled":
      return toastCardStatusIconAssets.warning;
    case "pending":
      return toastCardStatusIconAssets.queueWaiting;
  }
}
