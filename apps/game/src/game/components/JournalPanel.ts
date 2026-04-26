import Phaser from "phaser";

export type JournalSection = "needs" | "ideas" | "skills" | "checks";

export type JournalTab = {
  section: JournalSection;
  background: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
};

export class JournalPanel {
  visible = false;
  sectionIndex = 0;

  readonly sections: JournalSection[] = ["needs", "ideas", "skills", "checks"];

  constructor(
    public readonly background: Phaser.GameObjects.Rectangle,
    public readonly title: Phaser.GameObjects.Text,
    public readonly tabs: JournalTab[],
    public readonly body: Phaser.GameObjects.Text,
    public readonly screenX: number,
    public readonly screenY: number,
    public readonly width: number,
    public readonly height: number,
  ) {}

  get activeSection(): JournalSection {
    return this.sections[this.sectionIndex] ?? "needs";
  }

  nextSection(): void {
    this.sectionIndex = (this.sectionIndex + 1) % this.sections.length;
  }

  setSection(section: JournalSection): void {
    const index = this.sections.indexOf(section);

    if (index >= 0) {
      this.sectionIndex = index;
    }
  }
}
