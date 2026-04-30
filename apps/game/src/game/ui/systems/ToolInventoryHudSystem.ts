import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { Entity, World } from "../../../ecs/World";
import { ForageDrop } from "../../items/components/ForageDrop";
import { getItemDefinition, itemLabel } from "../../items/ItemDefinitions";
import { Hands } from "../../player/components/Hands";
import { SeedDrop } from "../../plants/components/SeedDrop";
import { WeightInspectable } from "../../shared/components/WeightInspectable";
import { WeightedObject } from "../../shared/components/WeightedObject";
import { hudColors } from "../HudTheme";
import { ToolInventoryHud, type HudSlot } from "../components/ToolInventoryHud";

const selectionShortcuts: Array<{ slotId: string; keyCode: number; label: string }> = [
  { slotId: "tool:hands", keyCode: Phaser.Input.Keyboard.KeyCodes.ONE, label: "1" },
  { slotId: "item:left", keyCode: Phaser.Input.Keyboard.KeyCodes.TWO, label: "2" },
  { slotId: "item:right", keyCode: Phaser.Input.Keyboard.KeyCodes.THREE, label: "3" },
];

export class ToolInventoryHudSystem implements System {
  private readonly keys = new Map<number, Phaser.Input.Keyboard.Key>();

  update(world: World): void {
    const hands = world.query(Hands)[0]?.[1];

    for (const [, hud] of world.query(ToolInventoryHud)) {
      this.updateSelectionShortcuts(hud);
      this.positionHud(hud);
      this.updateTools(hud);
      this.updateItems(world, hud, hands);
    }
  }

  private updateTools(hud: ToolInventoryHud): void {
    const slot = hud.slots.find((entry) => entry.id === "tool:hands");

    if (!slot) {
      return;
    }

    this.setSlot(slot, {
      icon: "H",
      label: "Hands",
      count: "",
      shortcut: shortcutForSlot(slot.id),
      filled: true,
      selected: hud.selectedSlotId === slot.id,
      locked: false,
      unavailable: false,
    });
  }

  private updateItems(
    world: World,
    hud: ToolInventoryHud,
    hands: Hands | undefined,
  ): void {
    const leftHeld = hands?.left.held;
    const rightHeld = hands?.right.held;

    this.updateCarrySlot(world, hud, "item:left", "Left", leftHeld);
    this.updateCarrySlot(world, hud, "item:right", "Right", rightHeld);
    hud.capacityLabel.setText("");
  }

  private updateCarrySlot(
    world: World,
    hud: ToolInventoryHud,
    slotId: string,
    emptyLabel: string,
    held: Entity | undefined,
  ): void {
    const slot = hud.slots.find((entry) => entry.id === slotId);

    if (!slot) {
      return;
    }

    if (!held) {
      this.setSlot(slot, {
        icon: "-",
        label: emptyLabel,
        count: "Empty",
        shortcut: shortcutForSlot(slot.id),
        filled: false,
        selected: hud.selectedSlotId === slot.id,
        locked: false,
        unavailable: false,
      });
      return;
    }

    const seedDrop = world.getComponent(held, SeedDrop);
    const forageDrop = world.getComponent(held, ForageDrop);
    const inspectable = world.getComponent(held, WeightInspectable);
    const weight = world.getComponent(held, WeightedObject);
    const itemId = seedDrop?.seedId ?? forageDrop?.itemId;
    const label = itemId ? itemLabel(itemId) : (inspectable?.label ?? "Item");
    const amount = seedDrop?.amount ?? forageDrop?.amount;

    this.setSlot(slot, {
      icon: iconForItem(itemId, label),
      label,
      count:
        amount !== undefined
          ? `x${amount}`
          : weight
            ? `${weight.weight} kg`
            : "Held",
      shortcut: shortcutForSlot(slot.id),
      filled: true,
      selected: hud.selectedSlotId === slot.id,
      locked: false,
      unavailable: false,
    });
  }

  private setSlot(
    slot: HudSlot,
    state: {
      icon: string;
      label: string;
      count: string;
      shortcut: string;
      filled: boolean;
      selected: boolean;
      locked: boolean;
      unavailable: boolean;
    },
  ): void {
    const border = state.selected
      ? hudColors.selected
      : state.filled
        ? hudColors.borderWarm
        : 0x68817d;
    const fill = state.filled ? 0x1f3034 : hudColors.trackDark;

    slot.background.setFillStyle(fill, state.unavailable ? 0.55 : 0.92);
    slot.background.setStrokeStyle(2, border, state.selected ? 0.95 : 0.56);
    slot.selection.setVisible(state.selected);
    slot.iconFrame.setFillStyle(state.filled ? hudColors.panelWarm : hudColors.track, 0);
    slot.iconFrame.setStrokeStyle(1, border, state.selected ? 0.9 : 0.45);
    slot.icon.setText(state.icon);
    slot.icon.setColor(state.filled ? hudColors.textWarm : "#93a7a1");
    slot.label.setText("");
    slot.count.setText("");
    slot.shortcut.setText(state.shortcut);
    slot.lockOverlay.setVisible(state.locked);
    slot.pulse.setVisible(false);
  }

  private updateSelectionShortcuts(hud: ToolInventoryHud): void {
    const keyboard = hud.container.scene.input.keyboard;

    if (!keyboard) {
      return;
    }

    for (const binding of selectionShortcuts) {
      let key = this.keys.get(binding.keyCode);

      if (!key) {
        key = keyboard.addKey(binding.keyCode);
        this.keys.set(binding.keyCode, key);
      }

      if (Phaser.Input.Keyboard.JustDown(key)) {
        hud.selectedSlotId = binding.slotId;
      }
    }
  }

  private positionHud(hud: ToolInventoryHud): void {
    const camera = hud.container.scene.cameras.main;
    const screenScale = Math.min(1, (camera.width - 24) / hud.background.width);
    const scale = screenScale / camera.zoom;
    const worldX = camera.worldView.x + (camera.width / 2) * (1 / camera.zoom);
    const worldY =
      camera.worldView.y +
      (camera.height - hud.screenYFromBottom) * (1 / camera.zoom);

    hud.container.setPosition(worldX, worldY);
    hud.container.setScale(scale);
  }
}

function shortcutForSlot(slotId: string): string {
  return selectionShortcuts.find((binding) => binding.slotId === slotId)?.label ?? "";
}

function iconForItem(itemId: string | undefined, label: string): string {
  if (!itemId) {
    return label.charAt(0).toUpperCase();
  }

  const definition = getItemDefinition(itemId);

  switch (definition?.category) {
    case "seed":
      return "S";
    case "wood":
      return "W";
    case "stone":
      return "St";
    case "fiber":
      return "F";
    case "ore":
      return "O";
    case "gem":
      return "G";
    case "mushroom":
      return "M";
    case "flower":
      return "Fl";
    case "reagent":
      return "R";
    case "shell":
      return "Sh";
    default:
      return label.charAt(0).toUpperCase();
  }
}
