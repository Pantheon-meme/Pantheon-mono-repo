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
import { hudColors } from "../HudTheme";
import { TargetActionMenu } from "../components/TargetActionMenu";

const buttonWidth = 184;
const buttonHeight = 44;
const buttonGap = 8;
const horizontalPadding = 20;

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

    const contentWidth = actions.length * buttonWidth + (actions.length - 1) * buttonGap;
    const width = Math.min(menu.width, contentWidth + horizontalPadding * 2);
    const height = buttonHeight;

    menu.background.setSize(width, height);
    menu.background.setPosition(0, 0);
    menu.background.setVisible(false);
    menu.title.setVisible(false);
    menu.maxScrollX = Math.max(0, contentWidth - (width - horizontalPadding * 2));
    menu.scrollX = Math.min(menu.scrollX, menu.maxScrollX);

    actions.forEach((action, index) => {
      const x = index * (buttonWidth + buttonGap);
      const scene = menu.container.scene;
      const queued = queue.pendingActionIds.includes(action.id);
      const executing = progress.active && progress.actionId === action.id;
      const container = scene.add.container(x, 0);
      const background = scene.add
        .rectangle(0, 0, buttonWidth, buttonHeight, buttonFill(queued, executing), 0.94)
        .setOrigin(0.5)
        .setStrokeStyle(1, buttonBorder(queued, executing), executing ? 0.95 : 0.64)
        .setInteractive({ useHandCursor: true });
      const hint = hints.get(action.id);
      const iconFrame = scene.add
        .circle(-buttonWidth / 2 + 24, 0, 15, hudColors.panelWarm, 0.96)
        .setStrokeStyle(1, buttonBorder(queued, executing), 0.68);
      const icon = scene.add
        .text(-buttonWidth / 2 + 24, 0, iconForAction(action.id), {
          align: "center",
          color: hudColors.textWarm,
          fixedWidth: 28,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "13px",
          fontStyle: "700",
        })
        .setOrigin(0.5);
      const label = scene.add
        .text(-buttonWidth / 2 + 46, -13, action.label, {
          color: "#f6efd7",
          fixedWidth: buttonWidth - 82,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "13px",
          fontStyle: "700",
        })
        .setOrigin(0, 0.5);
      const detail = scene.add
        .text(-buttonWidth / 2 + 46, 9, action.detail ?? "", {
          color: hudColors.textSoft,
          fixedWidth: buttonWidth - 92,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "11px",
        })
        .setOrigin(0, 0.5);
      const shortcut = scene.add
        .text(buttonWidth / 2 - 24, 0, hint ?? "", {
          align: "center",
          color: "#f6efd7",
          fixedWidth: 36,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "11px",
          fontStyle: "700",
        })
        .setOrigin(0.5);
      const status = scene.add
        .rectangle(-buttonWidth / 2, -buttonHeight / 2, 4, buttonHeight, buttonBorder(queued, executing), 0.96)
        .setOrigin(0);

      background.on("pointerover", () => {
        background.setFillStyle(0x314556, 0.98);
      });
      background.on("pointerout", () => {
        background.setFillStyle(buttonFill(queued, executing), 0.94);
      });
      background.on("pointerdown", () => {
        queue.push(action.id);
      });

      container.add([
        background,
        status,
        iconFrame,
        icon,
        label,
        detail,
        shortcut,
      ]);
      menu.content.add(container);
      menu.buttons.push({
        actionId: action.id,
        container,
        background,
        iconFrame,
        icon,
        label,
        detail,
        shortcut,
        status,
        x,
        width: buttonWidth,
      });
    });
  }

  private placeMenu(menu: TargetActionMenu): void {
    const camera = menu.container.scene.cameras.main;
    const screenScale = Math.min(1, (camera.width - 24) / menu.background.width);
    const worldScale = 1 / camera.zoom;
    const scale = screenScale * worldScale;
    const height = menu.background.height;
    const margin = 18 * scale;
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
    const startX = -menu.background.width / 2 + horizontalPadding + buttonWidth / 2;
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
    [Phaser.Input.Keyboard.KeyCodes.SPACE]: "Space",
    [Phaser.Input.Keyboard.KeyCodes.ONE]: "1",
    [Phaser.Input.Keyboard.KeyCodes.TWO]: "2",
    [Phaser.Input.Keyboard.KeyCodes.THREE]: "3",
    [Phaser.Input.Keyboard.KeyCodes.FOUR]: "4",
    [Phaser.Input.Keyboard.KeyCodes.FIVE]: "5",
  };

  return keyNames[keyCode] ?? String.fromCharCode(keyCode);
}

function iconForAction(actionId: string): string {
  if (actionId.includes("dig")) {
    return "D";
  }

  if (actionId.includes("forage")) {
    return "F";
  }

  if (actionId.includes("plant")) {
    return "P";
  }

  if (actionId.includes("fetch")) {
    return "H";
  }

  if (actionId.includes("sleep")) {
    return "Z";
  }

  if (actionId.includes("hand")) {
    return "G";
  }

  return ">";
}

function buttonFill(queued: boolean, executing: boolean): number {
  if (executing) {
    return 0x314556;
  }

  if (queued) {
    return 0x203840;
  }

  return 0x1a2630;
}

function buttonBorder(queued: boolean, executing: boolean): number {
  if (executing) {
    return hudColors.progress;
  }

  if (queued) {
    return hudColors.pending;
  }

  return hudColors.borderWarm;
}
