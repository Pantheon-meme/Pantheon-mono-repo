import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { itemLabel } from "../../items/ItemDefinitions";
import { PlayerInventory } from "../../inventory/components/PlayerInventory";
import { InventoryHud } from "../components/InventoryHud";

const slotWidth = 136;
const slotHeight = 46;
const slotGap = 8;

export class InventoryHudSystem implements System {
  private previousKey?: Phaser.Input.Keyboard.Key;
  private nextKey?: Phaser.Input.Keyboard.Key;

  constructor(
    private readonly keyboard: Phaser.Input.Keyboard.KeyboardPlugin,
  ) {}

  update(world: World): void {
    const inventory = world.query(PlayerInventory)[0]?.[1];

    for (const [, hud] of world.query(InventoryHud)) {
      const camera = hud.container.scene.cameras.main;
      const scale = 1 / camera.zoom;
      const worldX = camera.worldView.x + hud.screenX * scale;
      const worldY = camera.worldView.y + hud.screenY * scale;

      hud.container.setPosition(worldX, worldY);
      hud.container.setScale(scale);

      if (!inventory) {
        hud.title.setText("Inventory unavailable");
        continue;
      }

      this.handleKeyboard(inventory);
      this.rebuildIfNeeded(hud, inventory);
      this.updateSlotStyles(hud, inventory);

      hud.title.setText(`Inventory ${formatWeight(inventory.usedWeight)} / ${formatWeight(
        inventory.maxWeight,
      )}  Q/E select`);
    }
  }

  private handleKeyboard(inventory: PlayerInventory): void {
    this.previousKey ??= this.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.nextKey ??= this.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    if (Phaser.Input.Keyboard.JustDown(this.previousKey)) {
      inventory.selectNext(-1);
    }

    if (Phaser.Input.Keyboard.JustDown(this.nextKey)) {
      inventory.selectNext(1);
    }
  }

  private rebuildIfNeeded(hud: InventoryHud, inventory: PlayerInventory): void {
    const signature = `${Math.ceil(inventory.maxWeight)}|${inventory
      .sortedSlots()
      .map((slot) => `${slot.slot}:${slot.itemId}:${slot.amount}:${slot.weight}:${slot.label ?? ""}`)
      .join("|")}`;

    if (signature === hud.signature) {
      return;
    }

    hud.signature = signature;

    for (const view of hud.slotViews) {
      view.background.destroy();
      view.label.destroy();
    }

    hud.slotViews.length = 0;

    const slotCount = Math.max(1, Math.ceil(inventory.maxWeight));

    for (let slot = 0; slot < slotCount; slot += 1) {
      const x = slot * (slotWidth + slotGap);
      const entry = inventory.slots.get(slot);
      const background = hud.container.scene.add
        .rectangle(x, 34, slotWidth, slotHeight, 0x15212a, 0.92)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x8fbfd0, 0.72)
        .setInteractive({ useHandCursor: true });
      const label = hud.container.scene.add
        .text(x + 10, 42, formatSlot(slot, entry), {
          color: "#eef7f4",
          fixedWidth: slotWidth - 18,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "13px",
          lineSpacing: 1,
        })
        .setOrigin(0, 0);

      background.on("pointerdown", () => {
        inventory.selectSlot(slot);
        this.updateSlotStyles(hud, inventory);
      });

      hud.container.add([background, label]);
      hud.slotViews.push({ slot, background, label });
    }
  }

  private updateSlotStyles(
    hud: InventoryHud,
    inventory: PlayerInventory,
  ): void {
    for (const view of hud.slotViews) {
      const active = view.slot === inventory.activeSlot;

      view.background
        .setFillStyle(active ? 0x27495a : 0x15212a, active ? 0.98 : 0.92)
        .setStrokeStyle(
          active ? 2 : 1,
          active ? 0xf1d38b : 0x8fbfd0,
          active ? 0.96 : 0.72,
        );
    }
  }
}

function formatSlot(
  slot: number,
  entry:
    | {
        itemId: string;
        amount: number;
        weight: number;
        label?: string;
        syncState?: "pending" | "confirmed" | "rejected";
      }
    | undefined,
): string {
  if (!entry) {
    return `${slot + 1}. Empty`;
  }

  const amount = entry.amount > 1 ? ` x${entry.amount}` : "";
  const sync =
    entry.syncState && entry.syncState !== "confirmed"
      ? ` (${entry.syncState})`
      : "";

  return `${slot + 1}. ${entry.label ?? itemLabel(entry.itemId)}${amount}\n${formatWeight(
    entry.weight,
  )}${sync}`;
}

function formatWeight(weight: number): string {
  return Number.isInteger(weight) ? `${weight}` : weight.toFixed(2);
}
