import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { Entity, World } from "../../../ecs/World";
import { ForageDrop } from "../../items/components/ForageDrop";
import {
  forageItemSpriteTextureKey,
  getForageItemSpriteAsset,
  getForageItemSpriteCell,
} from "../../items/ForageItemSpriteAssets";
import { itemLabel } from "../../items/ItemDefinitions";
import { Hands } from "../../player/components/Hands";
import { HarvestedPlant } from "../../plants/components/HarvestedPlant";
import { SeedDrop } from "../../plants/components/SeedDrop";
import {
  getHarvestItemSpriteFrameIndex,
  getPlantSpriteAssetBySeed,
  getPlantSpriteAsset,
  getSeedItemSpriteFrameIndex,
  plantSpriteTextureKey,
  plantSpriteTextureKeyBySeed,
} from "../../plants/PlantSpriteAssets";
import { WeightInspectable } from "../../shared/components/WeightInspectable";
import { WeightedObject } from "../../shared/components/WeightedObject";
import { uiIconAssets } from "../../../assets/ui/UiImageAssets";
import { MarketplacePanel } from "../components/MarketplacePanel";
import { ToolInventoryHud, type HudSlot } from "../components/ToolInventoryHud";

const selectionShortcuts: Array<{ slotId: string; keyCode: number; label: string }> = [
  { slotId: "tool:axe", keyCode: Phaser.Input.Keyboard.KeyCodes.ONE, label: "1" },
  {
    slotId: "tool:watering-can",
    keyCode: Phaser.Input.Keyboard.KeyCodes.TWO,
    label: "2",
  },
  {
    slotId: "tool:hands",
    keyCode: Phaser.Input.Keyboard.KeyCodes.THREE,
    label: "3",
  },
  { slotId: "item:left", keyCode: Phaser.Input.Keyboard.KeyCodes.FOUR, label: "4" },
  { slotId: "item:right", keyCode: Phaser.Input.Keyboard.KeyCodes.SIX, label: "6" },
];

type SlotIconState =
  | {
      kind: "placeholder";
    }
  | {
      kind: "image";
      textureKey: string;
      width: number;
      height: number;
    }
  | {
      kind: "sprite";
      textureKey: string;
      frame: number;
      size: number;
    };

export class ToolInventoryHudSystem implements System {
  private readonly keys = new Map<number, Phaser.Input.Keyboard.Key>();

  update(world: World): void {
    const hands = world.query(Hands)[0]?.[1];
    const marketplaceOpen = world
      .query(MarketplacePanel)
      .some(([, panel]) => panel.visible);

    for (const [, hud] of world.query(ToolInventoryHud)) {
      hud.container.setVisible(!marketplaceOpen);

      if (marketplaceOpen) {
        continue;
      }

      this.updateSelectionShortcuts(hud);
      this.positionHud(hud);
      this.updateTools(hud);
      this.updateItems(world, hud, hands);
    }
  }

  private updateTools(hud: ToolInventoryHud): void {
    for (const slot of hud.slots) {
      if (slot.kind !== "tool") {
        continue;
      }

      this.setSlot(slot, {
        icon: iconForTool(slot.id),
        label: labelForTool(slot.id),
        count: "",
        shortcut: shortcutForSlot(slot.id),
        filled: true,
        selected: hud.selectedSlotId === slot.id,
        locked: false,
        unavailable: false,
      });
    }
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
        icon: { kind: "placeholder" },
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
    const harvestedPlant = world.getComponent(held, HarvestedPlant);
    const inspectable = world.getComponent(held, WeightInspectable);
    const weight = world.getComponent(held, WeightedObject);
    const itemId = seedDrop?.seedId ?? forageDrop?.itemId;
    const label = itemId ? itemLabel(itemId) : (inspectable?.label ?? "Item");
    const amount = seedDrop?.amount ?? forageDrop?.amount;

    this.setSlot(slot, {
      icon: iconForHeldItem(
        seedDrop?.seedId,
        forageDrop?.itemId,
        harvestedPlant?.plantId,
      ),
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
      icon: SlotIconState;
      label: string;
      count: string;
      shortcut: string;
      filled: boolean;
      selected: boolean;
      locked: boolean;
      unavailable: boolean;
    },
  ): void {
    slot.background.setAlpha(state.unavailable ? 0.55 : 1);
    slot.selection.setVisible(state.selected);
    slot.hover.setVisible(slot.hovered && !state.locked);
    slot.hover.setAlpha(state.unavailable ? 0.32 : 0.66);
    this.setSlotIcon(slot, state.icon, state.filled);
    slot.label.setText(state.label);
    slot.count.setText(state.count);
    slot.shortcut.setText(state.shortcut);
    slot.lockOverlay.setVisible(state.locked);
    slot.pulse.setVisible(false);
  }

  private setSlotIcon(
    slot: HudSlot,
    icon: SlotIconState,
    filled: boolean,
  ): void {
    if (icon.kind === "image") {
      slot.iconSprite
        .setTexture(icon.textureKey)
        .setDisplaySize(icon.width, icon.height)
        .setAlpha(filled ? 1 : 0.45)
        .setVisible(true);
      slot.iconPlaceholder.setVisible(false);
      return;
    }

    if (icon.kind === "sprite") {
      slot.iconSprite
        .setTexture(icon.textureKey)
        .setFrame(icon.frame)
        .setDisplaySize(icon.size, icon.size)
        .setAlpha(filled ? 1 : 0.45)
        .setVisible(true);
      slot.iconPlaceholder.setVisible(false);
      return;
    }

    slot.iconSprite.setVisible(false);
    slot.iconPlaceholder
      .setAlpha(filled ? 0.82 : 0.42)
      .setVisible(true);
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
    const screenScale = Math.min(hud.displayScale, (camera.width - 24) / hud.width);
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

function iconForTool(slotId: string): SlotIconState {
  if (slotId === "tool:axe") {
    return {
      kind: "image",
      textureKey: uiIconAssets.axe.textureKey,
      width: 64,
      height: 64,
    };
  }

  if (slotId === "tool:watering-can") {
    return {
      kind: "image",
      textureKey: uiIconAssets.wateringCan.textureKey,
      width: 64,
      height: 64,
    };
  }

  if (slotId === "tool:hands") {
    return {
      kind: "image",
      textureKey: uiIconAssets.hands.textureKey,
      width: 62,
      height: 62,
    };
  }

  return { kind: "placeholder" };
}

function labelForTool(slotId: string): string {
  if (slotId === "tool:axe") {
    return "Axe";
  }

  if (slotId === "tool:watering-can") {
    return "Water";
  }

  return "Hands";
}

function iconForHeldItem(
  seedId: string | undefined,
  forageItemId: string | undefined,
  plantId: string | undefined,
): SlotIconState {
  if (seedId) {
    const spriteAsset = getPlantSpriteAssetBySeed(seedId);
    const textureKey = plantSpriteTextureKeyBySeed(seedId);
    const frame = spriteAsset ? getSeedItemSpriteFrameIndex(spriteAsset) : undefined;

    if (spriteAsset && textureKey && frame !== undefined) {
      return {
        kind: "sprite",
        textureKey,
        frame,
        size: Math.min(48, spriteAsset.manifest.cellSize),
      };
    }
  }

  if (plantId) {
    const spriteAsset = getPlantSpriteAsset(plantId);
    const frame = spriteAsset ? getHarvestItemSpriteFrameIndex(spriteAsset, 0) : undefined;

    if (spriteAsset && frame !== undefined) {
      return {
        kind: "sprite",
        textureKey: plantSpriteTextureKey(plantId),
        frame,
        size: Math.min(50, spriteAsset.manifest.cellSize),
      };
    }
  }

  if (forageItemId) {
    const spriteCell = getForageItemSpriteCell(forageItemId);
    const spriteAsset = getForageItemSpriteAsset(forageItemId);
    const textureKey = forageItemSpriteTextureKey(forageItemId);

    if (spriteCell && spriteAsset && textureKey) {
      return {
        kind: "sprite",
        textureKey,
        frame: spriteCell.row * spriteAsset.manifest.columns + spriteCell.column,
        size: 44,
      };
    }
  }

  return { kind: "placeholder" };
}
