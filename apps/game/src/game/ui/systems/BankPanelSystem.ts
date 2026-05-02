import Phaser from "phaser";
import type { Hex } from "viem";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { ActionLog } from "../../actions/components/ActionLog";
import { CucBalance } from "../../currency/components/CucBalance";
import { PlayerInventory } from "../../inventory/components/PlayerInventory";
import {
  forageItemSpriteTextureKey,
  getForageItemSpriteAsset,
  getForageItemSpriteCell,
} from "../../items/ForageItemSpriteAssets";
import { itemColor, itemDefinitions, itemLabel } from "../../items/ItemDefinitions";
import { MudWorld } from "../../mud/components/MudWorld";
import { FocusTarget } from "../../player/components/FocusTarget";
import { PlayerControlled } from "../../player/components/PlayerControlled";
import { plantDefinitions } from "../../plants/PlantDefinitions";
import {
  getHarvestItemSpriteFrameIndex,
  getPlantSpriteAsset,
  getPlantSpriteAssetBySeed,
  getSeedItemSpriteFrameIndex,
  plantSpriteTextureKey,
  plantSpriteTextureKeyBySeed,
} from "../../plants/PlantSpriteAssets";
import {
  BankPanel,
  type BankPanelElement,
  type BankPanelRowView,
} from "../components/BankPanel";

const contentX = 18;
const contentY = 116;
const contentWidth = 584;
const contentHeight = 452;
const cardWidth = 176;
const cardHeight = 112;
const cardGap = 12;
const gridColumns = 3;
const iconSize = 34;
const scrollStep = 48;
const itemIds = Object.keys(itemDefinitions);
const zeroCuc = BigInt(0);

export class BankPanelSystem implements System {
  private readonly escapeKey?: Phaser.Input.Keyboard.Key;
  private wheelDeltaY = 0;
  private wheelPointer?: Phaser.Input.Pointer;

  constructor(scene: Phaser.Scene) {
    this.escapeKey = scene.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC,
    );
    scene.input.on(
      "wheel",
      (
        pointer: Phaser.Input.Pointer,
        _objects: Phaser.GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number,
      ) => {
        this.wheelPointer = pointer;
        this.wheelDeltaY += deltaY;
      },
    );
  }

  update(world: World): void {
    const panel = world.query(BankPanel)[0]?.[1];
    const player = world.query(PlayerControlled, FocusTarget, PlayerInventory)[0];
    const mudWorld = world.query(MudWorld)[0]?.[1];

    if (!panel) {
      return;
    }

    this.positionPanel(panel);

    if (!player || !mudWorld) {
      this.setVisible(panel, false);
      return;
    }

    const [actor, , , inventory] = player;
    this.updateInput(panel);
    this.updateScroll(panel);

    if (!panel.visible) {
      this.setVisible(panel, false);
      return;
    }

    if (panel.quotes.size === 0 && !panel.loading) {
      void this.refreshQuotes(panel, mudWorld, itemIds);
    }

    const signature = this.buildSignature(panel, inventory);

    if (signature !== panel.signature) {
      panel.signature = signature;
      this.rebuildRows(panel, inventory, mudWorld, world, actor);
    }

    this.updateTabs(panel);
    this.setVisible(panel, true);
  }

  private updateInput(panel: BankPanel): void {
    if (this.escapeKey && Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      panel.visible = false;
    }
  }

  private updateScroll(panel: BankPanel): void {
    if (!panel.visible) {
      this.wheelDeltaY = 0;
      this.wheelPointer = undefined;
      return;
    }

    if (this.wheelDeltaY === 0 || !this.wheelPointer) {
      return;
    }

    const scale = panel.container.scaleX || 1;
    const localX = (this.wheelPointer.worldX - panel.container.x) / scale;
    const localY = (this.wheelPointer.worldY - panel.container.y) / scale;
    const isInsideContent =
      localX >= contentX &&
      localX <= contentX + contentWidth &&
      localY >= contentY &&
      localY <= contentY + contentHeight;

    if (isInsideContent) {
      panel.scrollY = Phaser.Math.Clamp(
        panel.scrollY + Math.sign(this.wheelDeltaY) * scrollStep,
        0,
        panel.maxScrollY,
      );
      panel.content.setPosition(contentX, contentY - panel.scrollY);
      this.updateCardVisibility(panel);
      this.updateScrollbar(panel);
    }

    this.wheelDeltaY = 0;
    this.wheelPointer = undefined;
  }

  private async refreshQuotes(
    panel: BankPanel,
    mudWorld: MudWorld,
    ids: string[],
  ): Promise<void> {
    if (panel.loading) {
      return;
    }

    panel.loading = true;
    panel.message = "Reading Central Uni Bank prices...";
    panel.signature = "";

    try {
      panel.setQuotes(await mudWorld.bridge.readBankItemQuotes(ids));
      panel.message = "Prices loaded.";
    } catch (error) {
      panel.message = formatError(error);
    } finally {
      panel.loading = false;
      panel.signature = "";
    }
  }

  private buildSignature(
    panel: BankPanel,
    inventory: PlayerInventory,
  ): string {
    return [
      panel.visible,
      panel.activeTab,
      panel.loading,
      panel.pending,
      panel.message,
      inventory
        .sortedSlots()
        .map((slot) => `${slot.slot}:${slot.itemId}:${slot.objectId}:${slot.syncState ?? ""}`)
        .join("|"),
      [...panel.quotes.values()]
        .map(
          (quote) =>
            `${quote.itemId}:${quote.buyPrice}:${quote.sellPrice}:${quote.inventoryQuantity}:${quote.priceExists}`,
        )
        .join("|"),
    ].join("::");
  }

  private rebuildRows(
    panel: BankPanel,
    inventory: PlayerInventory,
    mudWorld: MudWorld,
    world: World,
    actor: number,
  ): void {
    for (const row of panel.rows) {
      for (const element of row.elements) {
        element.destroy();
      }
    }

    panel.rows.length = 0;
    panel.title.setText("Central Uni Bank");
    panel.status.setText(this.getStatusText(panel));
    panel.content.setPosition(contentX, contentY - panel.scrollY);
    this.updateCardVisibility(panel);
    this.updateScrollbar(panel);

    const entries =
      panel.activeTab === "sell"
        ? this.getSellEntries(panel, inventory)
        : this.getBuyEntries(panel);

    if (entries.length === 0) {
      panel.scrollY = 0;
      panel.maxScrollY = 0;
      panel.content.setPosition(contentX, contentY);
      this.updateCardVisibility(panel);
      this.updateScrollbar(panel);
      this.createEmptyRow(
        panel,
        panel.activeTab === "sell"
          ? "No inventory items with active bank buy prices."
          : "No bank inventory currently available for purchase.",
      );
      return;
    }

    entries.forEach((entry, index) => {
      const row = this.createCard(panel, index, entry);

      if (!panel.pending && entry.enabled) {
        const background = row.elements[0] as Phaser.GameObjects.Rectangle;
        background.on("pointerdown", () => {
          if (entry.kind === "sell") {
            this.sellInventoryObjects(panel, inventory, mudWorld, world, actor, entry);
          } else if (entry.kind === "buy") {
            this.buyBankObject(panel, mudWorld, world, actor, entry);
          }
        });
      }
    });
    panel.maxScrollY = Math.max(
      0,
      Math.ceil(entries.length / gridColumns) * (cardHeight + cardGap) - cardGap - contentHeight,
    );
    panel.scrollY = Phaser.Math.Clamp(panel.scrollY, 0, panel.maxScrollY);
    panel.content.setPosition(contentX, contentY - panel.scrollY);
    this.updateCardVisibility(panel);
    this.updateScrollbar(panel);
  }

  private getSellEntries(
    panel: BankPanel,
    inventory: PlayerInventory,
  ): SellEntry[] {
    const grouped = new Map<string, string[]>();

    for (const slot of inventory.sortedSlots()) {
      if (slot.syncState === "pending") {
        continue;
      }

      const objectIds = grouped.get(slot.itemId) ?? [];
      objectIds.push(slot.objectId);
      grouped.set(slot.itemId, objectIds);
    }

    return itemIds
      .map((itemId) => {
        const quote = panel.quotes.get(itemId);
        const label = itemLabel(itemId);
        const objectIds = grouped.get(itemId) ?? [];
        const price = quote?.priceExists ? quote.buyPrice : zeroCuc;
        const maxQuantity = quote?.buyMaxQuantity && quote.buyMaxQuantity > 0
          ? quote.buyMaxQuantity
          : objectIds.length;
        const sellQuantity = Math.min(objectIds.length, maxQuantity);
        const enabled = Boolean(quote?.priceExists && price > zeroCuc && sellQuantity > 0);

        return {
          kind: "sell" as const,
          enabled,
          itemId,
          label,
          objectIds,
          sellQuantity,
          title: `${label} x${objectIds.length}`,
          detail: `Bank pays ${formatPrice(price)} each`,
          action: enabled
            ? sellQuantity > 1
              ? `Sell ${sellQuantity}`
              : "Sell 1"
            : getDisabledSellAction(quote?.priceExists ?? false, price, objectIds.length),
        };
      })
      .sort(
        (a, b) =>
          Number(b.enabled) - Number(a.enabled) || a.label.localeCompare(b.label),
      );
  }

  private getBuyEntries(panel: BankPanel): BuyEntry[] {
    return itemIds
      .map((itemId) => {
        const quote = panel.quotes.get(itemId);
        const label = itemLabel(itemId);
        const price = quote?.priceExists ? quote.sellPrice : zeroCuc;
        const quantity = quote?.inventoryQuantity ?? 0;
        const enabled = Boolean(quote?.priceExists && price > zeroCuc && quantity > 0);

        return {
          kind: "buy" as const,
          enabled,
          itemId,
          label,
          quantity,
          title: `${label} x${quantity}`,
          detail: `Price ${formatPrice(price)}`,
          action: enabled
            ? "Buy 1"
            : getDisabledBuyAction(quote?.priceExists ?? false, price, quantity),
        };
      })
      .sort(
        (a, b) =>
          Number(b.enabled) - Number(a.enabled) || a.label.localeCompare(b.label),
      );
  }

  private createEmptyRow(panel: BankPanel, text: string): void {
    this.createRow(panel, panel.rows.length, text, "", "");
  }

  private createCard(
    panel: BankPanel,
    index: number,
    entry: BankEntry,
  ): BankPanelRowView {
    const column = index % gridColumns;
    const rowIndex = Math.floor(index / gridColumns);
    const x = column * (cardWidth + cardGap);
    const y = rowIndex * (cardHeight + cardGap);
    const color = itemColor(entry.itemId);
    const background = panel.container.scene.add
      .rectangle(x, y, cardWidth, cardHeight, 0x15222b, 0.94)
      .setOrigin(0, 0)
      .setStrokeStyle(1, entry.enabled ? 0x8fbfd0 : 0x5f6f74, entry.enabled ? 0.62 : 0.42)
      .setInteractive({ useHandCursor: entry.enabled });
    const swatch = panel.container.scene.add
      .rectangle(x + 12, y + 12, 22, 22, color, entry.enabled ? 1 : 0.58)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xf6efd7, 0.45);
    const icon = createItemIcon(
      panel.container.scene,
      entry.itemId,
      x + 23,
      y + 23,
    );
    const title = panel.container.scene.add
      .text(x + 42, y + 10, entry.label, {
        color: "#f6efd7",
        fixedWidth: cardWidth - 54,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "13px",
        fontStyle: "700",
        wordWrap: { width: cardWidth - 54 },
      })
      .setOrigin(0, 0);
    const quantity = panel.container.scene.add
      .text(x + 12, y + 46, getQuantityText(entry), {
        color: "#b9c9c8",
        fixedWidth: cardWidth - 24,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "12px",
      })
      .setOrigin(0, 0);
    const detail = panel.container.scene.add
      .text(x + 12, y + 64, entry.detail, {
        color: "#b9c9c8",
        fixedWidth: cardWidth - 24,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "12px",
        wordWrap: { width: cardWidth - 24 },
      })
      .setOrigin(0, 0);
    const action = panel.container.scene.add
      .text(x + 12, y + 86, entry.action, {
        align: "center",
        color: entry.enabled ? "#101820" : "#aeb8b5",
        fixedWidth: cardWidth - 24,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "12px",
        fontStyle: "700",
        backgroundColor: entry.enabled ? "#f1d38b" : "#26343a",
        padding: { x: 4, y: 4 },
      })
      .setOrigin(0, 0);
    if (icon) {
      swatch.setFillStyle(0x101820, 0.7);
      icon.setAlpha(entry.enabled ? 1 : 0.55);
    }

    const elements: BankPanelElement[] = [
      background,
      swatch,
      ...(icon ? [icon] : []),
      title,
      quantity,
      detail,
      action,
    ];

    if (!entry.enabled) {
      const overlay = panel.container.scene.add
        .rectangle(x, y, cardWidth, cardHeight, 0x071016, 0.42)
        .setOrigin(0, 0);
      elements.push(overlay);
    }

    background.on("pointerover", () => {
      if (entry.enabled) {
        background.setFillStyle(0x203644, 0.98);
      }
    });
    background.on("pointerout", () => {
      background.setFillStyle(0x15222b, 0.94);
    });

    panel.content.add(elements);
    const row = { id: entry.title, y, elements };
    panel.rows.push(row);

    return row;
  }

  private createRow(
    panel: BankPanel,
    index: number,
    titleText: string,
    detailText: string,
    actionText: string,
  ): BankPanelRowView {
    return this.createCard(panel, index, {
      kind: "empty",
      enabled: false,
      itemId: "wild_fiber",
      label: titleText,
      title: titleText,
      detail: detailText,
      action: actionText,
    });
  }

  private sellInventoryObjects(
    panel: BankPanel,
    inventory: PlayerInventory,
    mudWorld: MudWorld,
    world: World,
    actor: number,
    entry: SellEntry,
  ): void {
    if (panel.pending) {
      return;
    }

    const objectIds = entry.objectIds.slice(0, entry.sellQuantity) as Hex[];

    if (
      !mudWorld.bridge.submitSellObjectsToBank(objectIds, [entry.itemId], {
        onConfirmed: (sale) => {
          if (sale.inventory) {
            inventory.replaceSlots(
              sale.inventory.slots.map((slot) => ({
                ...slot,
                syncState: "confirmed",
              })),
              sale.inventory.maxWeight,
            );
          }
          this.updateCucBalance(world, actor, sale.cucBalance);
          panel.setQuotes(sale.bankQuotes);
          panel.pending = false;
          panel.message = `Sold ${entry.sellQuantity} ${entry.label}.`;
          panel.signature = "";
        },
        onRejected: (message) => {
          for (const objectId of objectIds) {
            const slot = [...inventory.slots.values()].find(
              (candidate) => candidate.objectId === objectId,
            );
            if (slot) {
              slot.syncState = "rejected";
            }
          }
          panel.pending = false;
          panel.message = message;
          panel.signature = "";
        },
      })
    ) {
      for (const objectId of objectIds) {
        const slot = [...inventory.slots.values()].find(
          (candidate) => candidate.objectId === objectId,
        );
        if (slot) {
          slot.syncState = "pending";
        }
      }
      panel.pending = true;
      panel.message = `Selling ${entry.sellQuantity} ${entry.label}...`;
      this.writeLog(world, actor, panel.message);
      panel.signature = "";
    }
  }

  private buyBankObject(
    panel: BankPanel,
    mudWorld: MudWorld,
    world: World,
    actor: number,
    entry: BuyEntry,
  ): void {
    if (panel.pending) {
      return;
    }

    if (
      mudWorld.bridge.submitBuyObjectFromBank(entry.itemId, {
        onConfirmed: (purchase) => {
          const inventory = world.getComponent(actor, PlayerInventory);
          if (inventory && purchase.inventory) {
            inventory.replaceSlots(
              purchase.inventory.slots.map((slot) => ({
                ...slot,
                syncState: "confirmed",
              })),
              purchase.inventory.maxWeight,
            );
          }
          this.updateCucBalance(world, actor, purchase.cucBalance);
          panel.setQuotes(purchase.bankQuotes);
          panel.pending = false;
          panel.message = `Bought 1 ${entry.label}.`;
          panel.signature = "";
        },
        onRejected: (message) => {
          panel.pending = false;
          panel.message = message;
          panel.signature = "";
        },
      })
    ) {
      panel.pending = true;
      panel.message = `Buying 1 ${entry.label}...`;
      this.writeLog(world, actor, panel.message);
      panel.signature = "";
    }
  }

  private writeLog(world: World, actor: number, message: string): void {
    const log = world.getComponent(actor, ActionLog);

    if (log) {
      log.lastMessage = message;
    }
  }

  private updateCucBalance(
    world: World,
    actor: number,
    confirmedBalance: bigint | undefined,
  ): void {
    if (confirmedBalance === undefined) {
      return;
    }

    let balance = world.getComponent(actor, CucBalance);

    if (!balance) {
      balance = new CucBalance();
      world.addComponent(actor, CucBalance, balance);
    }

    balance.setConfirmed(confirmedBalance);
  }

  private updateTabs(panel: BankPanel): void {
    const sellActive = panel.activeTab === "sell";
    const buyActive = panel.activeTab === "buy";

    panel.sellTab
      .setFillStyle(sellActive ? 0xf1d38b : 0x1a2a32, sellActive ? 1 : 0.92)
      .setStrokeStyle(2, sellActive ? 0xfff3a1 : 0x6f8f88, 0.82);
    panel.buyTab
      .setFillStyle(buyActive ? 0xf1d38b : 0x1a2a32, buyActive ? 1 : 0.92)
      .setStrokeStyle(2, buyActive ? 0xfff3a1 : 0x6f8f88, 0.82);
    panel.sellTabLabel.setColor(sellActive ? "#101820" : "#dce8e2");
    panel.buyTabLabel.setColor(buyActive ? "#101820" : "#dce8e2");
    panel.status.setText(this.getStatusText(panel));
  }

  private updateScrollbar(panel: BankPanel): void {
    const visible = panel.maxScrollY > 0;
    panel.scrollbarTrack.setVisible(visible);
    panel.scrollbarThumb.setVisible(visible);

    if (!visible) {
      return;
    }

    const contentRange = panel.maxScrollY + contentHeight;
    const thumbHeight = Math.max(48, (contentHeight / contentRange) * contentHeight);
    const thumbRange = contentHeight - thumbHeight;
    const thumbY =
      contentY + (panel.maxScrollY > 0 ? (panel.scrollY / panel.maxScrollY) * thumbRange : 0);

    panel.scrollbarThumb.setSize(8, thumbHeight).setPosition(panel.width - 18, thumbY);
  }

  private updateCardVisibility(panel: BankPanel): void {
    for (const row of panel.rows) {
      const visibleY = row.y - panel.scrollY;
      const visible = visibleY > -cardHeight && visibleY < contentHeight;

      for (const element of row.elements) {
        element.setVisible(visible);
      }
    }
  }

  private getStatusText(panel: BankPanel): string {
    return panel.pending || panel.loading ? panel.message : `${panel.message}  Esc close`;
  }

  private positionPanel(panel: BankPanel): void {
    const camera = panel.container.scene.cameras.main;
    const scale = 1 / camera.zoom;
    const worldX = camera.worldView.x + (camera.width * scale) / 2;
    const worldY = camera.worldView.y + (camera.height * scale) / 2;

    panel.container.setPosition(worldX - (panel.width * scale) / 2, worldY - (panel.height * scale) / 2);
    panel.container.setScale(scale);
  }

  private setVisible(panel: BankPanel, visible: boolean): void {
    panel.container.setVisible(visible);
  }
}

type SellEntry = {
  kind: "sell";
  enabled: boolean;
  itemId: string;
  label: string;
  objectIds: string[];
  sellQuantity: number;
  title: string;
  detail: string;
  action: string;
};

type BuyEntry = {
  kind: "buy";
  enabled: boolean;
  itemId: string;
  label: string;
  quantity: number;
  title: string;
  detail: string;
  action: string;
};

type EmptyEntry = {
  kind: "empty";
  enabled: false;
  itemId: string;
  label: string;
  title: string;
  detail: string;
  action: string;
};

type BankEntry = SellEntry | BuyEntry | EmptyEntry;

function getQuantityText(entry: BankEntry): string {
  if (entry.kind === "sell") {
    return `Carry ${entry.objectIds.length}`;
  }

  if (entry.kind === "buy") {
    return `Stock ${entry.quantity}`;
  }

  return "";
}

function getDisabledBuyAction(
  priceExists: boolean,
  price: bigint,
  quantity: number,
): string {
  if (!priceExists || price <= zeroCuc) {
    return "No price";
  }

  if (quantity <= 0) {
    return "Out of stock";
  }

  return "Unavailable";
}

function getDisabledSellAction(
  priceExists: boolean,
  price: bigint,
  quantity: number,
): string {
  if (!priceExists || price <= zeroCuc) {
    return "No price";
  }

  if (quantity <= 0) {
    return "None held";
  }

  return "Unavailable";
}

function createItemIcon(
  scene: Phaser.Scene,
  itemId: string,
  x: number,
  y: number,
): Phaser.GameObjects.Sprite | undefined {
  return (
    createForageItemIcon(scene, itemId, x, y) ??
    createSeedItemIcon(scene, itemId, x, y) ??
    createHarvestItemIcon(scene, itemId, x, y)
  );
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

  const frameIndex =
    spriteCell.row * spriteAsset.manifest.columns + spriteCell.column;

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

function formatPrice(price: bigint): string {
  return `${price.toString()} CUC`;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
