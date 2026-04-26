import Phaser from "phaser";
import type { System } from "../../ecs/System";
import type { World } from "../../ecs/World";
import { IdeaState } from "../components/IdeaState";
import { JournalPanel } from "../components/JournalPanel";
import { KnowledgeState } from "../components/KnowledgeState";
import { NeedState } from "../components/NeedState";
import { SkillSet } from "../components/SkillSet";
import { ideaDefinitions } from "../ideas/IdeaDefinitions";
import { checkQualityLabel } from "../rules/CheckResolver";

export class JournalSystem implements System {
  private readonly toggleKey?: Phaser.Input.Keyboard.Key;
  private readonly nextSectionKey?: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    this.toggleKey = scene.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.J,
    );
    this.nextSectionKey = scene.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.TAB,
    );
  }

  update(world: World): void {
    const playerMind = world.query(
      NeedState,
      IdeaState,
      KnowledgeState,
      SkillSet,
    )[0];

    for (const [, panel] of world.query(JournalPanel)) {
      this.updateInput(panel);
      this.positionPanel(panel);

      if (!panel.visible || !playerMind) {
        this.setPanelVisible(panel, false);
        continue;
      }

      const [, needs, ideas, knowledge, skills] = playerMind;
      this.setPanelVisible(panel, true);
      this.updateTabs(panel);
      panel.title.setText(this.getTitle());
      panel.body.setText(this.getBody(panel, needs, ideas, knowledge, skills));
    }
  }

  private updateInput(panel: JournalPanel): void {
    if (this.toggleKey && Phaser.Input.Keyboard.JustDown(this.toggleKey)) {
      panel.visible = !panel.visible;
    }

    if (
      panel.visible &&
      this.nextSectionKey &&
      Phaser.Input.Keyboard.JustDown(this.nextSectionKey)
    ) {
      panel.nextSection();
    }
  }

  private positionPanel(panel: JournalPanel): void {
    const camera = panel.background.scene.cameras.main;
    const scale = 1 / camera.zoom;
    const worldX = camera.worldView.x + panel.screenX * scale;
    const worldY = camera.worldView.y + panel.screenY * scale;

    panel.background.setPosition(worldX, worldY);
    panel.background.setScale(scale);
    panel.title.setPosition(worldX + 20 * scale, worldY + 18 * scale);
    panel.title.setScale(scale);
    panel.body.setPosition(worldX + 20 * scale, worldY + 112 * scale);
    panel.body.setScale(scale);

    panel.tabs.forEach((tab, index) => {
      const tabWidth = 112;
      const tabX = worldX + (20 + index * (tabWidth + 8)) * scale;
      const tabY = worldY + 62 * scale;

      tab.background.setPosition(tabX, tabY);
      tab.background.setScale(scale);
      tab.label.setPosition(tabX + (tabWidth / 2) * scale, tabY + 17 * scale);
      tab.label.setScale(scale);
    });
  }

  private getTitle(): string {
    return "Journal";
  }

  private getBody(
    panel: JournalPanel,
    needs: NeedState,
    ideas: IdeaState,
    knowledge: KnowledgeState,
    skills: SkillSet,
  ): string {
    switch (panel.activeSection) {
      case "needs":
        return this.getNeedsBody(needs);
      case "ideas":
        return this.getIdeasBody(ideas, knowledge);
      case "skills":
        return this.getSkillsBody(skills, knowledge);
      case "checks":
        return this.getChecksBody(ideas);
    }
  }

  private getNeedsBody(needs: NeedState): string {
    const activeNeeds = needs.activeNeeds;

    if (activeNeeds.length === 0) {
      return "No active needs.";
    }

    return activeNeeds
      .map(
        (need) =>
          `${need.label}\nUrgency ${need.urgency}/100\n${need.description}`,
      )
      .join("\n\n");
  }

  private getIdeasBody(ideas: IdeaState, knowledge: KnowledgeState): string {
    return Object.values(ideaDefinitions)
      .map((definition) => {
        const progress = ideas.getOrCreate(definition.id);
        const known = knowledge.knowsAll(definition.requiredKnownItems);
        const status = progress.unlocked
          ? "Unlocked"
          : known
            ? `${Math.floor(progress.progress)}/${definition.progressRequired}`
            : "Missing material knowledge";

        return `${definition.label} - ${status}\n${definition.description}`;
      })
      .join("\n\n");
  }

  private getSkillsBody(skills: SkillSet, knowledge: KnowledgeState): string {
    const skillLines = skills
      .entries()
      .map(([id, value]) => `${formatId(id)} ${value.toFixed(1)}`)
      .join("\n");
    const knownItems = [...knowledge.knownItems].map(formatId).join(", ");

    return `${skillLines || "No practiced skills yet."}\n\nKnown materials\n${knownItems || "Nothing notable yet."}`;
  }

  private getChecksBody(ideas: IdeaState): string {
    const check = ideas.lastCheck;

    if (!check) {
      return "No checks rolled yet. Press T to reflect.";
    }

    const modifiers = check.modifiers
      .map((modifier) => `${modifier.label}: ${formatSigned(modifier.value)}`)
      .join("\n");

    return `${checkQualityLabel(check.quality)}\n${check.dice[0]} + ${check.dice[1]} = ${check.roll}\nTotal ${check.total} vs Difficulty ${check.difficulty}\nMargin ${formatSigned(check.margin)}\n\n${modifiers}`;
  }

  private setPanelVisible(panel: JournalPanel, visible: boolean): void {
    panel.background.setVisible(visible);
    panel.title.setVisible(visible);
    panel.body.setVisible(visible);

    for (const tab of panel.tabs) {
      tab.background.setVisible(visible);
      tab.label.setVisible(visible);
    }
  }

  private updateTabs(panel: JournalPanel): void {
    for (const tab of panel.tabs) {
      const active = tab.section === panel.activeSection;

      tab.background.setFillStyle(
        active ? 0xf0c85a : 0x1b2a32,
        active ? 0.96 : 0.9,
      );
      tab.background.setStrokeStyle(
        2,
        active ? 0xfff3a1 : 0x6f8f88,
        active ? 0.95 : 0.5,
      );
      tab.label.setColor(active ? "#101820" : "#dce8e2");
      tab.label.setFontStyle(active ? "700" : "500");
    }
  }
}

function formatId(id: string): string {
  return id
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}
