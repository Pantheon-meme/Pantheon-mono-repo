import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { FocusTarget } from "../components/FocusTarget";
import { JournalPanel } from "../../ui/components/JournalPanel";
import { MarketplacePanel } from "../../ui/components/MarketplacePanel";

export class FocusInputSystem implements System {
  private readonly cycleKey?: Phaser.Input.Keyboard.Key;

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
    this.cycleKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
  }

  update(world: World): void {
    const journalOpen = world
      .query(JournalPanel)
      .some(([, panel]) => panel.visible);
    const marketplaceOpen = world
      .query(MarketplacePanel)
      .some(([, panel]) => panel.visible);

    if (journalOpen || marketplaceOpen) {
      return;
    }

    if (!this.cycleKey || !Phaser.Input.Keyboard.JustDown(this.cycleKey)) {
      return;
    }

    for (const [, focus] of world.query(FocusTarget)) {
      focus.requestCycle();
    }
  }
}
