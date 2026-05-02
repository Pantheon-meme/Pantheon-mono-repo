import type { BankItemQuoteSnapshot } from "../../mud/MudWorldTypes";

export type BankPanelTab = "sell" | "buy";
export type BankPanelElement = Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.Visible;

export type BankPanelRowView = {
  id: string;
  y: number;
  elements: BankPanelElement[];
};

export class BankPanel {
  visible = false;
  activeTab: BankPanelTab = "sell";
  loading = false;
  pending = false;
  scrollY = 0;
  maxScrollY = 0;
  message = "Focus the Central Uni Bank and press Enter.";
  signature = "";
  readonly quotes = new Map<string, BankItemQuoteSnapshot>();
  readonly rows: BankPanelRowView[] = [];

  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly background: Phaser.GameObjects.Rectangle,
    public readonly title: Phaser.GameObjects.Text,
    public readonly closeButton: Phaser.GameObjects.Text,
    public readonly sellTab: Phaser.GameObjects.Rectangle,
    public readonly sellTabLabel: Phaser.GameObjects.Text,
    public readonly buyTab: Phaser.GameObjects.Rectangle,
    public readonly buyTabLabel: Phaser.GameObjects.Text,
    public readonly status: Phaser.GameObjects.Text,
    public readonly content: Phaser.GameObjects.Container,
    public readonly contentMask: Phaser.Display.Masks.GeometryMask,
    public readonly scrollbarTrack: Phaser.GameObjects.Rectangle,
    public readonly scrollbarThumb: Phaser.GameObjects.Rectangle,
    public readonly width: number,
    public readonly height: number,
  ) {}

  setQuotes(quotes: BankItemQuoteSnapshot[]): void {
    for (const quote of quotes) {
      this.quotes.set(quote.itemId, quote);
    }
  }
}
