import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import {
  getTargetActions,
  type TargetActionEntry,
} from "../../actions/ActionAvailability";
import { ActionBindings } from "../../actions/components/ActionBindings";
import { ActionProgress } from "../../actions/components/ActionProgress";
import { ActionQueue } from "../../actions/components/ActionQueue";
import { PlayerControlled } from "../../player/components/PlayerControlled";
import {
  actionButtonBgSlices,
  actionButtonBgTextureKey,
  actionButtonKeyboardShortcutKeyAsset,
  actionButtonKeyboardShortcutKeyTextureKey,
  uiIconAssets,
  type UiIconAsset,
} from "../../../assets/ui/UiImageAssets";
import { MarketplacePanel } from "../components/MarketplacePanel";
import { TargetActionMenu } from "../components/TargetActionMenu";

const buttonMinWidth = 300;
const buttonMaxWidth = 520;
const buttonHeight = 128;
const buttonGap = 14;
const horizontalPadding = 18;
const displayScale = 0.48;
const screenBottomMargin = 6;
const hoverScale = 1.035;
const pressScale = 0.965;
const iconLeftInset = 84;
const actionIconDisplaySize = 70;
const statusIconDisplaySize = 26;
const labelLeftInset = 126;
const labelShortcutGap = 18;
const shortcutRightInset = iconLeftInset;
const shortcutKeyWidth = actionButtonKeyboardShortcutKeyAsset.width * 1.38;
const shortcutKeyHeight = actionButtonKeyboardShortcutKeyAsset.height * 1.36;
const labelFontFamily =
  "Trebuchet MS, Chalkboard SE, Comic Sans MS, sans-serif";

export class TargetActionMenuSystem implements System {
  update(world: World): void {
    const player = world.query(
      PlayerControlled,
      ActionQueue,
      ActionProgress,
    )[0];
    const menu = world.query(TargetActionMenu)[0]?.[1];

    if (!player || !menu) {
      return;
    }

    const [actor, , queue, progress] = player;
    const actions = getTargetActions(world, actor);
    const marketplaceOpen = world
      .query(MarketplacePanel)
      .some(([, panel]) => panel.visible);

    if (marketplaceOpen) {
      this.setVisible(menu, false);
      return;
    }

    if (actions.length === 0) {
      this.setVisible(menu, false);
      return;
    }

    const hints = getActionHints(world);
    const signature = `${actions
      .map((action) => `${action.id}:${action.label}:${action.detail ?? ""}`)
      .join("|")}|${[...hints.entries()].map(([id, hint]) => `${id}:${hint}`)}|${queue.pendingActionIds.join(",")}|${progress.actionId ?? ""}:${progress.active}`;

    if (signature !== menu.signature) {
      menu.signature = signature;
      this.rebuildMenu(menu, actions, hints, queue, progress);
    }

    this.placeMenu(menu);
    this.updateScroll(menu);
    this.setVisible(menu, true);
  }

  private rebuildMenu(
    menu: TargetActionMenu,
    actions: TargetActionEntry[],
    hints: Map<string, string>,
    queue: ActionQueue,
    progress: ActionProgress,
  ): void {
    for (const button of menu.buttons) {
      button.container.destroy(true);
    }

    menu.buttons.length = 0;

    const scene = menu.container.scene;
    const layouts = actions.map((action) => ({
      action,
      hint: hints.get(action.id) ?? "",
      width: measureButtonWidth(scene, action.label),
    }));
    const contentWidth = layouts.reduce(
      (total, layout, index) =>
        total + layout.width + (index > 0 ? buttonGap : 0),
      0,
    );
    const width = Math.min(menu.width, contentWidth + horizontalPadding * 2);
    const height = buttonHeight;

    menu.background.setSize(width, height);
    menu.background.setPosition(0, 0);
    menu.background.setVisible(false);
    menu.title.setVisible(false);
    menu.maxScrollX = Math.max(0, contentWidth - (width - horizontalPadding * 2));
    menu.scrollX = Math.min(menu.scrollX, menu.maxScrollX);

    let cursorX = 0;

    layouts.forEach(({ action, hint, width: actionButtonWidth }) => {
      const x = cursorX + actionButtonWidth / 2;
      const executing = progress.active && progress.actionId === action.id;
      const queued = queue.pendingActionIds.includes(action.id);
      const actionIcon = iconForTargetAction(action);
      const container = scene.add.container(x, 0);
      const background = scene.add
        .nineslice(
          0,
          0,
          actionButtonBgTextureKey,
          undefined,
          actionButtonWidth,
          buttonHeight,
          actionButtonBgSlices.left,
          actionButtonBgSlices.right,
          actionButtonBgSlices.top,
          actionButtonBgSlices.bottom,
        )
        .setOrigin(0.5)
        .setAlpha(executing ? 1 : 0.98)
        .setInteractive({ useHandCursor: true });
      const icon = scene.add
        .image(
          -actionButtonWidth / 2 + iconLeftInset,
          0,
          actionIcon.textureKey,
        )
        .setDisplaySize(actionIconDisplaySize, actionIconDisplaySize)
        .setOrigin(0.5);
      const statusIcon = scene.add
        .image(
          actionButtonWidth / 2 - 32,
          -buttonHeight / 2 + 32,
          uiIconAssets.pending.textureKey,
        )
        .setDisplaySize(statusIconDisplaySize, statusIconDisplaySize)
        .setAlpha(executing ? 0.95 : 0.74)
        .setVisible(queued || executing)
        .setOrigin(0.5);
      const label = scene.add
        .text(-actionButtonWidth / 2 + labelLeftInset, -2, action.label, {
          color: "#3d2011",
          fixedWidth: labelWidth(actionButtonWidth),
          fontFamily: labelFontFamily,
          fontSize: "35px",
          fontStyle: "bold",
          shadow: {
            color: "#f4d79f",
            blur: 2,
            fill: true,
            offsetX: 0,
            offsetY: 2,
          },
        })
        .setOrigin(0, 0.5);
      const shortcutX = actionButtonWidth / 2 - shortcutRightInset;
      const shortcutKey = scene.add
        .image(shortcutX, 0, actionButtonKeyboardShortcutKeyTextureKey)
        .setDisplaySize(shortcutKeyWidth, shortcutKeyHeight)
        .setOrigin(0.5);
      const shortcut = scene.add
        .text(shortcutX, -1, hint, {
          align: "center",
          color: "#3d2011",
          fixedWidth: 60,
          fontFamily: labelFontFamily,
          fontSize: shortcutFontSize(hint),
          fontStyle: "bold",
          shadow: {
            color: "#f8e1b6",
            blur: 1,
            fill: true,
            offsetX: 0,
            offsetY: 1,
          },
        })
        .setOrigin(0.5);
      let pointerOver = false;
      let pressed = false;

      background.on("pointerover", () => {
        pointerOver = true;

        if (!pressed) {
          tweenButton(scene, container, hoverScale, 90, "Cubic.easeOut");
        }
      });
      background.on("pointerout", () => {
        pointerOver = false;
        pressed = false;
        tweenButton(scene, container, 1, 120, "Cubic.easeOut");
      });
      background.on("pointerdown", () => {
        pressed = true;
        tweenButton(scene, container, pressScale, 70, "Quad.easeOut");
        queue.push(action.id);
      });
      background.on("pointerup", () => {
        pressed = false;
        tweenButton(
          scene,
          container,
          pointerOver ? hoverScale : 1,
          160,
          "Back.easeOut",
        );
      });
      background.on("pointerupoutside", () => {
        pointerOver = false;
        pressed = false;
        tweenButton(scene, container, 1, 140, "Cubic.easeOut");
      });

      container.add([background, icon, statusIcon, label, shortcutKey, shortcut]);
      menu.content.add(container);
      menu.buttons.push({
        actionId: action.id,
        container,
        background,
        icon,
        label,
        shortcutKey,
        shortcut,
        x,
        width: actionButtonWidth,
      });
      cursorX += actionButtonWidth + buttonGap;
    });
  }

  private placeMenu(menu: TargetActionMenu): void {
    const camera = menu.container.scene.cameras.main;
    const screenScale = Math.min(
      displayScale,
      (camera.width - 24) / menu.background.width,
    );
    const worldScale = 1 / camera.zoom;
    const scale = screenScale * worldScale;
    const height = menu.background.height;
    const margin = screenBottomMargin * worldScale;
    const worldX = camera.worldView.x + (camera.width * worldScale) / 2;
    const worldY =
      camera.worldView.y +
      camera.height * worldScale -
      (height * scale) / 2 -
      margin;

    menu.container.setPosition(worldX, worldY);
    menu.container.setScale(scale);
  }

  private updateScroll(menu: TargetActionMenu): void {
    const startX = -menu.background.width / 2 + horizontalPadding;
    const viewportLeft = -menu.background.width / 2 + horizontalPadding;
    const viewportRight = menu.background.width / 2 - horizontalPadding;

    menu.leftIndicator.setVisible(menu.maxScrollX > 0 && menu.scrollX > 0);
    menu.rightIndicator.setVisible(
      menu.maxScrollX > 0 && menu.scrollX < menu.maxScrollX,
    );
    menu.leftIndicator.setPosition(-menu.background.width / 2 + 11, 0);
    menu.rightIndicator.setPosition(menu.background.width / 2 - 11, 0);

    for (const button of menu.buttons) {
      const x = startX + button.x - menu.scrollX;
      const visible =
        x + button.width / 2 >= viewportLeft - 2 &&
        x - button.width / 2 <= viewportRight + 2;

      button.container.setPosition(x, 0);
      button.container.setVisible(visible);
    }
  }

  private setVisible(menu: TargetActionMenu, visible: boolean): void {
    menu.container.setVisible(visible);
  }
}

function getActionHints(world: World): Map<string, string> {
  const bindings = world.query(ActionBindings)[0]?.[1];
  const hints = new Map<string, string>();

  if (!bindings) {
    return hints;
  }

  for (const [keyCodeText, actionId] of Object.entries(bindings.bindings)) {
    hints.set(actionId, formatKeyHint(Number.parseInt(keyCodeText, 10)));
  }

  return hints;
}

function formatKeyHint(keyCode: number): string {
  const keyNames: Record<number, string> = {
    [Phaser.Input.Keyboard.KeyCodes.SPACE]: "⎵",
    [Phaser.Input.Keyboard.KeyCodes.ONE]: "1",
    [Phaser.Input.Keyboard.KeyCodes.TWO]: "2",
    [Phaser.Input.Keyboard.KeyCodes.THREE]: "3",
    [Phaser.Input.Keyboard.KeyCodes.FOUR]: "4",
    [Phaser.Input.Keyboard.KeyCodes.FIVE]: "5",
  };

  return keyNames[keyCode] ?? String.fromCharCode(keyCode);
}

function measureButtonWidth(scene: Phaser.Scene, label: string): number {
  const measurement = scene.add
    .text(0, 0, label, {
      color: "#3d2011",
      fontFamily: labelFontFamily,
      fontSize: "35px",
      fontStyle: "bold",
    })
    .setVisible(false);
  const measuredWidth = Math.ceil(measurement.width);

  measurement.destroy();

  return Phaser.Math.Clamp(
    measuredWidth +
      labelLeftInset +
      shortcutRightInset +
      shortcutKeyWidth +
      labelShortcutGap,
    buttonMinWidth,
    buttonMaxWidth,
  );
}

function iconForTargetAction(action: TargetActionEntry): UiIconAsset {
  if (action.id === "dig") {
    return uiIconAssets.dig;
  }

  if (action.id === "forage") {
    return uiIconAssets.forage;
  }

  if (action.id === "plant" || action.id.endsWith("-hand-use")) {
    return uiIconAssets.plant;
  }

  if (action.id === "sleep") {
    return uiIconAssets.sleep;
  }

  if (action.id === "fetch") {
    return uiIconAssets.harvest;
  }

  if (action.id.endsWith("-hand-toggle")) {
    return uiIconAssets.grab;
  }

  if (action.id === "carry-more-need") {
    return uiIconAssets.drop;
  }

  return uiIconAssets.gather;
}

function labelWidth(buttonWidth: number): number {
  return Math.max(
    1,
    buttonWidth -
      labelLeftInset -
      shortcutRightInset -
      shortcutKeyWidth -
      labelShortcutGap,
  );
}

function shortcutFontSize(hint: string): string {
  if (hint.length <= 1) {
    return "36px";
  }

  if (hint.length <= 3) {
    return "26px";
  }

  return "20px";
}

function tweenButton(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  scale: number,
  duration: number,
  ease: string,
): void {
  scene.tweens.killTweensOf(container);
  scene.tweens.add({
    targets: container,
    scaleX: scale,
    scaleY: scale,
    duration,
    ease,
  });
}
