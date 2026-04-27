import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import {
  getTargetActions,
  type TargetActionEntry,
} from "../../actions/ActionAvailability";
import { ActionBindings } from "../../actions/components/ActionBindings";
import { ActionQueue } from "../../actions/components/ActionQueue";
import { FocusTarget } from "../../player/components/FocusTarget";
import { PlayerControlled } from "../../player/components/PlayerControlled";
import { TargetActionMenu } from "../components/TargetActionMenu";

const buttonWidth = 136;
const buttonHeight = 38;
const buttonGap = 8;
const maxColumns = 3;

export class TargetActionMenuSystem implements System {
  update(world: World): void {
    const player = world.query(PlayerControlled, FocusTarget, ActionQueue)[0];
    const menu = world.query(TargetActionMenu)[0]?.[1];

    if (!player || !menu) {
      return;
    }

    const [actor, , focus, queue] = player;
    const actions = getTargetActions(world, actor);

    if (actions.length === 0) {
      this.setVisible(menu, false);
      return;
    }

    const title = getTargetTitle(focus);
    const hints = getActionHints(world);
    const signature = `${title}|${actions
      .map((action) => `${action.id}:${action.label}:${action.detail ?? ""}`)
      .join("|")}|${[...hints.entries()].map(([id, hint]) => `${id}:${hint}`)}`;

    if (signature !== menu.signature) {
      menu.signature = signature;
      this.rebuildMenu(menu, actions, hints, queue);
    }

    menu.title.setText(title);
    this.placeMenu(menu);
    this.setVisible(menu, true);
  }

  private rebuildMenu(
    menu: TargetActionMenu,
    actions: TargetActionEntry[],
    hints: Map<string, string>,
    queue: ActionQueue,
  ): void {
    for (const button of menu.buttons) {
      button.background.destroy();
      button.label.destroy();
    }

    menu.buttons.length = 0;

    const columns = Math.min(maxColumns, actions.length);
    const rows = Math.ceil(actions.length / columns);
    const width = columns * buttonWidth + (columns - 1) * buttonGap + 28;
    const height = rows * buttonHeight + (rows - 1) * buttonGap + 66;

    menu.background.setSize(width, height);
    menu.background.setPosition(0, 0);
    menu.title.setPosition(0, -height / 2 + 18);

    actions.forEach((action, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x =
        -((columns - 1) * (buttonWidth + buttonGap)) / 2 +
        column * (buttonWidth + buttonGap);
      const y = -height / 2 + 52 + row * (buttonHeight + buttonGap);
      const background = menu.container.scene.add
        .rectangle(x, y, buttonWidth, buttonHeight, 0x1a2630, 0.94)
        .setOrigin(0.5)
        .setStrokeStyle(1, 0xf1d38b, 0.72)
        .setInteractive({ useHandCursor: true });
      const hint = hints.get(action.id);
      const labelText = hint ? `[${hint}] ${action.label}` : action.label;
      const label = menu.container.scene.add
        .text(x, y, formatButtonLabel(labelText, action.detail), {
          align: "center",
          color: "#f6efd7",
          fixedWidth: buttonWidth - 14,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "13px",
          lineSpacing: 1,
        })
        .setOrigin(0.5);

      background.on("pointerover", () => {
        background.setFillStyle(0x314556, 0.98);
      });
      background.on("pointerout", () => {
        background.setFillStyle(0x1a2630, 0.94);
      });
      background.on("pointerdown", () => {
        queue.push(action.id);
      });

      menu.container.add([background, label]);
      menu.buttons.push({ actionId: action.id, background, label });
    });
  }

  private placeMenu(menu: TargetActionMenu): void {
    const camera = menu.container.scene.cameras.main;
    const scale = 1 / camera.zoom;
    const height = menu.background.height;
    const margin = 24 * scale;
    const worldX = camera.worldView.x + (camera.width * scale) / 2;
    const worldY =
      camera.worldView.y +
      camera.height * scale -
      (height * scale) / 2 -
      margin;

    menu.container.setPosition(worldX, worldY);
    menu.container.setScale(scale);
  }

  private setVisible(menu: TargetActionMenu, visible: boolean): void {
    menu.container.setVisible(visible);
  }
}

function getTargetTitle(focus: FocusTarget): string {
  if (focus.kind === "object" && focus.objectLabel) {
    return focus.objectLabel;
  }

  return `Tile ${focus.tileX},${focus.tileY}`;
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
  };

  return keyNames[keyCode] ?? String.fromCharCode(keyCode);
}

function formatButtonLabel(label: string, detail: string | undefined): string {
  return detail ? `${label}\n${detail}` : label;
}
