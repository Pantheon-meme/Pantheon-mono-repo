import Phaser from "phaser";
import type { Hex } from "viem";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { ActionLog } from "../../actions/components/ActionLog";
import { CucBalance } from "../../currency/components/CucBalance";
import { PlayerInventory } from "../../inventory/components/PlayerInventory";
import { itemDefinitions, itemLabel } from "../../items/ItemDefinitions";
import { MudWorld } from "../../mud/components/MudWorld";
import { FocusTarget } from "../../player/components/FocusTarget";
import { PlayerControlled } from "../../player/components/PlayerControlled";
import { BankPanel, type BankPanelRowView } from "../components/BankPanel";

const maxRows = 8;
const rowHeight = 46;
const rowGap = 8;
const itemIds = Object.keys(itemDefinitions);
const zeroCuc = BigInt(0);

export class BankPanelSystem implements System {
  private readonly escapeKey?: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    this.escapeKey = scene.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC,
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
      row.background.destroy();
      row.title.destroy();
      row.detail.destroy();
      row.action.destroy();
    }

    panel.rows.length = 0;
    panel.title.setText("Central Uni Bank");
    panel.status.setText(this.getStatusText(panel));

    const entries =
      panel.activeTab === "sell"
        ? this.getSellEntries(panel, inventory)
        : this.getBuyEntries(panel);

    if (entries.length === 0) {
      this.createEmptyRow(
        panel,
        panel.activeTab === "sell"
          ? "No inventory items with active bank buy prices."
          : "No bank inventory currently available for purchase.",
      );
      return;
    }

    entries.slice(0, maxRows).forEach((entry, index) => {
      const row = this.createRow(panel, index, entry.title, entry.detail, entry.action);

      if (!panel.pending) {
        row.background.on("pointerdown", () => {
          if (entry.kind === "sell") {
            this.sellInventoryObjects(panel, inventory, mudWorld, world, actor, entry);
          } else {
            this.buyBankObject(panel, mudWorld, world, actor, entry);
          }
        });
      }
    });

    if (entries.length > maxRows) {
      this.createEmptyRow(panel, `${entries.length - maxRows} more rows hidden.`);
    }
  }

  private getSellEntries(
    panel: BankPanel,
    inventory: PlayerInventory,
  ): SellEntry[] {
    const grouped = new Map<string, string[]>();

    for (const slot of inventory.sortedSlots()) {
      const quote = panel.quotes.get(slot.itemId);

      if (
        !quote?.priceExists ||
        quote.buyPrice <= zeroCuc ||
        slot.syncState === "pending"
      ) {
        continue;
      }

      const objectIds = grouped.get(slot.itemId) ?? [];
      objectIds.push(slot.objectId);
      grouped.set(slot.itemId, objectIds);
    }

    return [...grouped.entries()]
      .map(([itemId, objectIds]) => {
        const quote = panel.quotes.get(itemId);
        const label = itemLabel(itemId);
        const maxQuantity = quote?.buyMaxQuantity && quote.buyMaxQuantity > 0
          ? quote.buyMaxQuantity
          : objectIds.length;
        const sellQuantity = Math.min(objectIds.length, maxQuantity);

        return {
          kind: "sell" as const,
          itemId,
          label,
          objectIds,
          sellQuantity,
          title: `${label} x${objectIds.length}`,
          detail: `Bank pays ${formatPrice(quote?.buyPrice ?? zeroCuc)} each`,
          action: sellQuantity > 1 ? `Sell ${sellQuantity}` : "Sell 1",
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  private getBuyEntries(panel: BankPanel): BuyEntry[] {
    return [...panel.quotes.values()]
      .filter(
        (quote) =>
          quote.priceExists &&
          quote.sellPrice > zeroCuc &&
          quote.inventoryQuantity > 0,
      )
      .map((quote) => {
        const label = itemLabel(quote.itemId);

        return {
          kind: "buy" as const,
          itemId: quote.itemId,
          label,
          title: `${label} x${quote.inventoryQuantity}`,
          detail: `Bank sells ${formatPrice(quote.sellPrice)} each`,
          action: "Buy 1",
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  private createEmptyRow(panel: BankPanel, text: string): void {
    this.createRow(panel, panel.rows.length, text, "", "");
  }

  private createRow(
    panel: BankPanel,
    index: number,
    titleText: string,
    detailText: string,
    actionText: string,
  ): BankPanelRowView {
    const y = 126 + index * (rowHeight + rowGap);
    const background = panel.container.scene.add
      .rectangle(18, y, panel.width - 36, rowHeight, 0x15222b, 0.94)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x8fbfd0, 0.55)
      .setInteractive({ useHandCursor: Boolean(actionText) });
    const title = panel.container.scene.add
      .text(32, y + 8, titleText, {
        color: "#f6efd7",
        fixedWidth: 220,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "14px",
        fontStyle: "700",
      })
      .setOrigin(0, 0);
    const detail = panel.container.scene.add
      .text(256, y + 8, detailText, {
        color: "#b9c9c8",
        fixedWidth: 190,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "12px",
        lineSpacing: 2,
      })
      .setOrigin(0, 0);
    const action = panel.container.scene.add
      .text(panel.width - 128, y + 13, actionText, {
        align: "center",
        color: actionText ? "#101820" : "#6f7f7d",
        fixedWidth: 94,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "13px",
        fontStyle: "700",
        backgroundColor: actionText ? "#f1d38b" : undefined,
        padding: { x: 4, y: 4 },
      })
      .setOrigin(0, 0);

    background.on("pointerover", () => {
      if (actionText) {
        background.setFillStyle(0x203644, 0.98);
      }
    });
    background.on("pointerout", () => {
      background.setFillStyle(0x15222b, 0.94);
    });

    panel.container.add([background, title, detail, action]);
    const row = { id: titleText, background, title, detail, action };
    panel.rows.push(row);

    return row;
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
  itemId: string;
  label: string;
  title: string;
  detail: string;
  action: string;
};

function formatPrice(price: bigint): string {
  return `${price.toString()} CUC`;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
