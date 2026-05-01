import type { BankItemQuoteSnapshot } from "../../mud/MudWorldTypes";

export type BankPanelTab = "sell" | "buy";

export type BankPanelRowView = {
  id: string;
  background: Phaser.GameObjects.Rectangle;
  title: Phaser.GameObjects.Text;
  detail: Phaser.GameObjects.Text;
  action: Phaser.GameObjects.Text;
};

export class BankPanel {
  visible = false;
  activeTab: BankPanelTab = "sell";
  loading = false;
  pending = false;
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
    public readonly width: number,
    public readonly height: number,
  ) {}

  setQuotes(quotes: BankItemQuoteSnapshot[]): void {
    for (const quote of quotes) {
      this.quotes.set(quote.itemId, quote);
    }
  }
}
