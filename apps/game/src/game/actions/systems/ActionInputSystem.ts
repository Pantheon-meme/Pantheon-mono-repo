import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { ActionBindings } from "../components/ActionBindings";
import { ActionQueue } from "../components/ActionQueue";

export class ActionInputSystem implements System {
  private readonly keys = new Map<number, Phaser.Input.Keyboard.Key>();

  constructor(
    private readonly keyboard: Phaser.Input.Keyboard.KeyboardPlugin,
  ) {}

  update(world: World): void {
    for (const [, bindings, queue] of world.query(
      ActionBindings,
      ActionQueue,
    )) {
      for (const [keyCodeText, actionId] of Object.entries(bindings.bindings)) {
        const keyCode = Number.parseInt(keyCodeText, 10);
        let key = this.keys.get(keyCode);

        if (!key) {
          key = this.keyboard.addKey(keyCode);
          this.keys.set(keyCode, key);
        }

        if (Phaser.Input.Keyboard.JustDown(key)) {
          queue.push(actionId);
        }
      }
    }
  }
}
