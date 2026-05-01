import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import {
  forageItemSpriteTextureKey,
  getForageItemSpriteAsset,
  getForageItemSpriteCell,
} from "../../items/ForageItemSpriteAssets";
import { itemColor, itemLabel } from "../../items/ItemDefinitions";
import { PlayerInventory } from "../../inventory/components/PlayerInventory";
import { plantDefinitions } from "../../plants/PlantDefinitions";
import {
  getHarvestItemSpriteFrameIndex,
  getPlantSpriteAsset,
  getPlantSpriteAssetBySeed,
  getSeedItemSpriteFrameIndex,
  plantSpriteTextureKey,
  plantSpriteTextureKeyBySeed,
} from "../../plants/PlantSpriteAssets";
import { InventoryHud } from "../components/InventoryHud";

const slotWidth = 198;
const slotHeight = 54;
const slotGap = 8;
const iconSize = 38;

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
    const signature = `${inventory.maxWeight}|${inventory
      .sortedSlots()
      .map((slot) => `${slot.slot}:${slot.itemId}:${slot.amount}:${slot.weight}:${slot.label ?? ""}`)
      .join("|")}`;

    if (signature === hud.signature) {
      return;
    }

    hud.signature = signature;

    for (const view of hud.slotViews) {
      view.background.destroy();
      view.icon?.destroy();
      view.fallbackIcon?.destroy();
      view.label.destroy();
    }

    hud.slotViews.length = 0;

    const entries = inventory.sortedSlots();

    if (entries.length === 0) {
      const background = hud.container.scene.add
        .rectangle(0, 34, slotWidth, slotHeight, 0x15212a, 0.72)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x8fbfd0, 0.48);
      const label = hud.container.scene.add
        .text(14, 51, "Empty\n0 carried", {
          color: "#b9c9c8",
          fixedWidth: slotWidth - 28,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "13px",
          lineSpacing: 2,
        })
        .setOrigin(0, 0);

      hud.container.add([background, label]);
      hud.slotViews.push({ slot: 0, background, label });
      return;
    }

    entries.forEach((entry, index) => {
      const x = index * (slotWidth + slotGap);
      const background = hud.container.scene.add
        .rectangle(x, 34, slotWidth, slotHeight, 0x15212a, 0.92)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x8fbfd0, 0.72)
        .setInteractive({ useHandCursor: true });
      const icon = createItemIcon(hud.container.scene, entry.itemId, x + 26, 61);
      const fallbackIcon = icon
        ? undefined
        : hud.container.scene.add
            .ellipse(x + 26, 61, iconSize, iconSize, itemColor(entry.itemId), 1)
            .setStrokeStyle(2, 0xfff3a1, 0.72);
      const label = hud.container.scene.add
        .text(x + 54, 43, formatSlot(entry), {
          color: "#eef7f4",
          fixedWidth: slotWidth - 64,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "13px",
          lineSpacing: 2,
        })
        .setOrigin(0, 0);

      background.on("pointerdown", () => {
        inventory.selectSlot(entry.slot);
        this.updateSlotStyles(hud, inventory);
      });

      hud.container.add([
        background,
        ...(icon ? [icon] : []),
        ...(fallbackIcon ? [fallbackIcon] : []),
        label,
      ]);
      hud.slotViews.push({
        slot: entry.slot,
        background,
        icon,
        fallbackIcon,
        label,
      });
    });
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

function formatSlot(entry: {
  itemId: string;
  amount: number;
  weight: number;
  label?: string;
  syncState?: "pending" | "confirmed" | "rejected";
}): string {
  const amount = entry.amount > 1 ? ` x${entry.amount}` : "";
  const sync =
    entry.syncState && entry.syncState !== "confirmed"
      ? ` (${entry.syncState})`
      : "";

  return `${entry.label ?? itemLabel(entry.itemId)}${amount}\n${formatWeight(
    entry.weight,
  )}${sync}`;
}

function createItemIcon(
  scene: Phaser.Scene,
  itemId: string,
  x: number,
  y: number,
): Phaser.GameObjects.Sprite | undefined {
  const forageSprite = createForageItemIcon(scene, itemId, x, y);

  if (forageSprite) {
    return forageSprite;
  }

  const seedSprite = createSeedItemIcon(scene, itemId, x, y);

  if (seedSprite) {
    return seedSprite;
  }

  return createHarvestItemIcon(scene, itemId, x, y);
}

function createForageItemIcon(
  scene: Phaser.Scene,
  itemId: string,
  x: number,
  y: number,
): Phaser.GameObjects.Sprite | undefined {
  const spriteCell = getForageItemSpriteCell(itemId);
  const spriteAsset = getForageItemSpriteAsset(itemId);
  const textureKey = forageItemSpriteTextureKey(itemId);

  if (!spriteCell || !spriteAsset || !textureKey) {
    return undefined;
  }

  const frameIndex = spriteCell.row * spriteAsset.manifest.columns + spriteCell.column;

  return scene.add
    .sprite(x, y, textureKey)
    .setOrigin(0.5)
    .setFrame(frameIndex)
    .setDisplaySize(iconSize, iconSize);
}

function createSeedItemIcon(
  scene: Phaser.Scene,
  itemId: string,
  x: number,
  y: number,
): Phaser.GameObjects.Sprite | undefined {
  const spriteAsset = getPlantSpriteAssetBySeed(itemId);
  const textureKey = plantSpriteTextureKeyBySeed(itemId);

  if (!spriteAsset || !textureKey) {
    return undefined;
  }

  const frameIndex = getSeedItemSpriteFrameIndex(spriteAsset);

  if (frameIndex === undefined) {
    return undefined;
  }

  return scene.add
    .sprite(x, y, textureKey)
    .setOrigin(0.5)
    .setFrame(frameIndex)
    .setDisplaySize(iconSize, iconSize);
}

function createHarvestItemIcon(
  scene: Phaser.Scene,
  itemId: string,
  x: number,
  y: number,
): Phaser.GameObjects.Sprite | undefined {
  const plant = Object.values(plantDefinitions).find(
    (definition) => `${definition.id}_harvest` === itemId,
  );

  if (!plant) {
    return undefined;
  }

  const spriteAsset = getPlantSpriteAsset(plant.id);

  if (!spriteAsset) {
    return undefined;
  }

  const frameIndex = getHarvestItemSpriteFrameIndex(spriteAsset, 0);

  if (frameIndex === undefined) {
    return undefined;
  }

  return scene.add
    .sprite(x, y, plantSpriteTextureKey(plant.id))
    .setOrigin(0.5)
    .setFrame(frameIndex)
    .setDisplaySize(iconSize, iconSize);
}

function formatWeight(weight: number): string {
  return Number.isInteger(weight) ? `${weight}` : weight.toFixed(2);
}
