import Phaser from "phaser";

export const marketplacePanelTabs = [
  { id: "buy", label: "Buy" },
  { id: "sell", label: "Sell" },
] as const;

export type MarketplacePanelTabId = (typeof marketplacePanelTabs)[number]["id"];

export type MarketplaceOfferStatus =
  | "idle"
  | "pending"
  | "confirmed"
  | "rejected";

export type MarketplaceOffer = {
  id: string;
  itemId: string;
  price: number;
  status?: MarketplaceOfferStatus;
  disabled?: boolean;
};

export type MarketplacePanelTab = {
  id: MarketplacePanelTabId;
  label: string;
  container: Phaser.GameObjects.Container;
  stand: Phaser.GameObjects.Image;
  background: Phaser.GameObjects.Image;
  text: Phaser.GameObjects.Text;
  hitArea: Phaser.GameObjects.Zone;
};

export type MarketplacePanelSlot = {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Image;
  iconSprite: Phaser.GameObjects.Sprite;
  placeholder: Phaser.GameObjects.Container;
  placeholderHalo: Phaser.GameObjects.Arc;
  placeholderCore: Phaser.GameObjects.Arc;
  priceText: Phaser.GameObjects.Text;
  actionButton: Phaser.GameObjects.Image;
  actionText: Phaser.GameObjects.Text;
  statusText: Phaser.GameObjects.Text;
  hitArea: Phaser.GameObjects.Zone;
  offerId?: string;
};

export type MarketplacePanelPagination = {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Image;
  previousButton: Phaser.GameObjects.Image;
  nextButton: Phaser.GameObjects.Image;
  pageText: Phaser.GameObjects.Text;
  previousHitArea: Phaser.GameObjects.Zone;
  nextHitArea: Phaser.GameObjects.Zone;
};

export type MarketplacePanelSelection = {
  tab: MarketplacePanelTabId;
  offerId: string;
  itemId: string;
};

export class MarketplacePanel {
  visible = false;
  activeTab: MarketplacePanelTabId = "buy";
  signature = "";
  pendingSelection?: MarketplacePanelSelection;

  readonly offers: Record<MarketplacePanelTabId, MarketplaceOffer[]> = {
    buy: [],
    sell: [],
  };

  readonly pageIndexByTab: Record<MarketplacePanelTabId, number> = {
    buy: 0,
    sell: 0,
  };

  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly background: Phaser.GameObjects.NineSlice,
    public readonly header: Phaser.GameObjects.Image,
    public readonly title: Phaser.GameObjects.Text,
    public readonly closeButtonContainer: Phaser.GameObjects.Container,
    public readonly closeButton: Phaser.GameObjects.Image,
    public readonly closeHitArea: Phaser.GameObjects.Zone,
    public readonly tabs: MarketplacePanelTab[],
    public readonly slots: MarketplacePanelSlot[],
    public readonly pagination: MarketplacePanelPagination,
    public readonly artboardWidth: number,
    public readonly artboardHeight: number,
    public readonly itemsPerPage: number,
  ) {}

  get activeOffers(): MarketplaceOffer[] {
    return this.offers[this.activeTab];
  }

  get pageIndex(): number {
    return this.pageIndexByTab[this.activeTab];
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.activeOffers.length / this.itemsPerPage));
  }

  open(tab: MarketplacePanelTabId = this.activeTab): void {
    this.activeTab = tab;
    this.visible = true;
    this.clampPage();
    this.invalidate();
  }

  close(): void {
    this.visible = false;
    this.invalidate();
  }

  setTab(tab: MarketplacePanelTabId): void {
    if (tab === this.activeTab) {
      return;
    }

    this.activeTab = tab;
    this.clampPage();
    this.invalidate();
  }

  setOffers(tab: MarketplacePanelTabId, offers: MarketplaceOffer[]): void {
    this.offers[tab] = offers;
    this.pageIndexByTab[tab] = 0;
    this.invalidate();
  }

  previousPage(): void {
    this.setPageIndex(this.pageIndex - 1);
  }

  nextPage(): void {
    this.setPageIndex(this.pageIndex + 1);
  }

  setPageIndex(pageIndex: number): void {
    const clamped = Phaser.Math.Clamp(pageIndex, 0, this.pageCount - 1);

    if (clamped === this.pageIndex) {
      return;
    }

    this.pageIndexByTab[this.activeTab] = clamped;
    this.invalidate();
  }

  selectSlot(slotIndex: number): void {
    const offer = this.activeOffers[this.pageIndex * this.itemsPerPage + slotIndex];

    if (!offer || offer.disabled) {
      return;
    }

    this.pendingSelection = {
      tab: this.activeTab,
      offerId: offer.id,
      itemId: offer.itemId,
    };
  }

  consumeSelection(): MarketplacePanelSelection | undefined {
    const selection = this.pendingSelection;

    this.pendingSelection = undefined;

    return selection;
  }

  invalidate(): void {
    this.signature = "";
  }

  private clampPage(): void {
    this.pageIndexByTab[this.activeTab] = Phaser.Math.Clamp(
      this.pageIndex,
      0,
      this.pageCount - 1,
    );
  }
}
