import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import {
  panelItemsGridPanelBuyTextureKey,
  panelItemsGridPanelSellTextureKey,
  panelPaginationButtonNextActiveTextureKey,
  panelPaginationButtonNextInactiveTextureKey,
  panelPaginationButtonPrevActiveTextureKey,
  panelPaginationButtonPrevInactiveTextureKey,
  panelTabLabelActiveBlueTextureKey,
  panelTabLabelActiveGreenTextureKey,
  panelTabLabelInactiveTextureKey,
} from "../../../assets/ui/UiImageAssets";
import {
  getForageItemSpriteAsset,
  getForageItemSpriteCell,
  forageItemSpriteTextureKey,
} from "../../items/ForageItemSpriteAssets";
import { itemColor } from "../../items/ItemDefinitions";
import {
  getPlantSpriteAssetBySeed,
  getSeedItemSpriteFrameIndex,
  plantSpriteTextureKeyBySeed,
} from "../../plants/PlantSpriteAssets";
import {
  MarketplacePanel,
  type MarketplaceOffer,
} from "../components/MarketplacePanel";

const screenMargin = 18;
const iconDisplaySize = Math.round(82 * 1.6);
const statusTextByStatus: Record<string, string> = {
  pending: "Pending",
  confirmed: "Done",
  rejected: "Rejected",
};

type ItemIconFrame = {
  textureKey: string;
  frame: number;
};

export class MarketplacePanelSystem implements System {
  update(world: World): void {
    for (const [, panel] of world.query(MarketplacePanel)) {
      this.placePanel(panel);
      panel.container.setVisible(panel.visible);

      if (!panel.visible) {
        continue;
      }

      const signature = panelSignature(panel);

      if (signature !== panel.signature) {
        panel.signature = signature;
        this.refreshPanel(panel);
      }
    }
  }

  private refreshPanel(panel: MarketplacePanel): void {
    this.refreshTabs(panel);
    this.refreshSlots(panel);
    this.refreshPagination(panel);
  }

  private refreshTabs(panel: MarketplacePanel): void {
    for (const tab of panel.tabs) {
      const active = tab.id === panel.activeTab;

      tab.background.setTexture(
        tabTextureKey(tab.id, active),
      );
      tab.background.setDisplaySize(active ? 92 : 90, active ? 42 : 41);
      tab.text.setColor(active ? "#fff8d7" : "#3d2414");
      tab.text.setShadow(
        0,
        active ? 2 : 1,
        active ? "#193a12" : "#f6d9a4",
        active ? 2 : 1,
        true,
        true,
      );
      tab.container.setDepth(active ? 2 : 1);
    }
  }

  private refreshSlots(panel: MarketplacePanel): void {
    const offers = panel.activeOffers;
    const pageStart = panel.pageIndex * panel.itemsPerPage;
    const actionTexture =
      panel.activeTab === "buy"
        ? panelItemsGridPanelBuyTextureKey
        : panelItemsGridPanelSellTextureKey;
    const actionLabel = panel.activeTab === "buy" ? "Buy" : "Sell";

    panel.slots.forEach((slot, slotIndex) => {
      const offer = offers[pageStart + slotIndex];

      slot.offerId = offer?.id;
      slot.container.setVisible(Boolean(offer));

      if (!offer) {
        return;
      }

      const iconFrame = getItemIconFrame(offer.itemId);
      const disabled = Boolean(offer.disabled);

      slot.background.setAlpha(disabled ? 0.62 : 1);
      slot.priceText.setText(offer.price.toLocaleString("en-US"));
      slot.priceText.setAlpha(disabled ? 0.55 : 1);
      slot.actionButton.setTexture(actionTexture);
      slot.actionButton.setAlpha(disabled ? 0.56 : 1);
      slot.actionText.setText(statusActionLabel(offer, actionLabel));
      slot.actionText.setAlpha(disabled ? 0.56 : 1);
      slot.statusText.setText(statusLabel(offer));
      slot.statusText.setVisible(Boolean(slot.statusText.text));
      slot.statusText.setColor(statusColor(offer));
      slot.hitArea.input!.enabled = !disabled;

      if (iconFrame) {
        slot.iconSprite
          .setTexture(iconFrame.textureKey)
          .setFrame(iconFrame.frame)
          .setDisplaySize(iconDisplaySize, iconDisplaySize)
          .setAlpha(disabled ? 0.5 : 1)
          .setVisible(true);
        slot.placeholder.setVisible(false);
      } else {
        const color = itemColor(offer.itemId);

        slot.iconSprite.setVisible(false);
        slot.placeholderHalo
          .setFillStyle(color, disabled ? 0.1 : 0.16)
          .setStrokeStyle(2, color, disabled ? 0.18 : 0.34);
        slot.placeholderCore
          .setFillStyle(color, disabled ? 0.3 : 0.58)
          .setStrokeStyle(1, 0x5c351c, disabled ? 0.18 : 0.32);
        slot.placeholder.setAlpha(disabled ? 0.6 : 1).setVisible(true);
      }
    });
  }

  private refreshPagination(panel: MarketplacePanel): void {
    const pageCount = panel.pageCount;
    const hasMultiplePages = pageCount > 1;
    const hasPrevious = panel.pageIndex > 0;
    const hasNext = panel.pageIndex < pageCount - 1;

    panel.pagination.container.setVisible(hasMultiplePages);

    if (!hasMultiplePages) {
      return;
    }

    panel.pagination.previousButton.setTexture(
      hasPrevious
        ? panelPaginationButtonPrevActiveTextureKey
        : panelPaginationButtonPrevInactiveTextureKey,
    );
    panel.pagination.nextButton.setTexture(
      hasNext
        ? panelPaginationButtonNextActiveTextureKey
        : panelPaginationButtonNextInactiveTextureKey,
    );
    panel.pagination.previousHitArea.input!.enabled = hasPrevious;
    panel.pagination.nextHitArea.input!.enabled = hasNext;
    panel.pagination.pageText.setText(`${panel.pageIndex + 1} / ${pageCount}`);
  }

  private placePanel(panel: MarketplacePanel): void {
    const camera = panel.container.scene.cameras.main;
    const worldScale = 1 / camera.zoom;
    const screenScale = Math.min(
      1,
      (camera.width - screenMargin * 2) / panel.artboardWidth,
      (camera.height - screenMargin * 2) / panel.artboardHeight,
    );
    const scale = screenScale * worldScale;
    const viewportWidth = camera.width * worldScale;
    const viewportHeight = camera.height * worldScale;
    const worldX =
      camera.worldView.x + (viewportWidth - panel.artboardWidth * scale) / 2;
    const worldY =
      camera.worldView.y + (viewportHeight - panel.artboardHeight * scale) / 2;

    panel.container.setPosition(worldX, worldY);
    panel.container.setScale(scale);
  }
}

function panelSignature(panel: MarketplacePanel): string {
  return [
    panel.visible ? "open" : "closed",
    panel.activeTab,
    panel.pageIndex,
    panel.activeOffers.length,
    ...panel.activeOffers.map(offerSignature),
  ].join("|");
}

function offerSignature(offer: MarketplaceOffer): string {
  return [
    offer.id,
    offer.itemId,
    offer.price,
    offer.status ?? "idle",
    offer.disabled ? "disabled" : "enabled",
  ].join(":");
}

function tabTextureKey(tabId: string, active: boolean): string {
  if (!active) {
    return panelTabLabelInactiveTextureKey;
  }

  return tabId === "buy"
    ? panelTabLabelActiveBlueTextureKey
    : panelTabLabelActiveGreenTextureKey;
}

function getItemIconFrame(itemId: string): ItemIconFrame | undefined {
  const seedAsset = getPlantSpriteAssetBySeed(itemId);
  const seedTextureKey = plantSpriteTextureKeyBySeed(itemId);
  const seedFrame =
    seedAsset && seedTextureKey
      ? getSeedItemSpriteFrameIndex(seedAsset)
      : undefined;

  if (seedTextureKey && seedFrame !== undefined) {
    return {
      textureKey: seedTextureKey,
      frame: seedFrame,
    };
  }

  const forageCell = getForageItemSpriteCell(itemId);
  const forageAsset = getForageItemSpriteAsset(itemId);
  const forageTextureKey = forageItemSpriteTextureKey(itemId);

  if (!forageCell || !forageAsset || !forageTextureKey) {
    return undefined;
  }

  return {
    textureKey: forageTextureKey,
    frame: forageCell.row * forageAsset.manifest.columns + forageCell.column,
  };
}

function statusActionLabel(offer: MarketplaceOffer, fallback: string): string {
  if (offer.status === "pending") {
    return "...";
  }

  return fallback;
}

function statusLabel(offer: MarketplaceOffer): string {
  const status = offer.status ?? "idle";

  return statusTextByStatus[status] ?? "";
}

function statusColor(offer: MarketplaceOffer): string {
  if (offer.status === "rejected") {
    return "#7b2218";
  }

  if (offer.status === "confirmed") {
    return "#2f641e";
  }

  return "#6b4721";
}
