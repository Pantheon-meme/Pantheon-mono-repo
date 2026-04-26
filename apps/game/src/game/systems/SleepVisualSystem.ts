import type { System } from "../../ecs/System";
import type { World } from "../../ecs/World";
import { Position } from "../components/Position";
import { Renderable } from "../components/Renderable";
import { SleepState } from "../components/SleepState";
import { SleepVisual } from "../components/SleepVisual";

type ScalableRenderable = {
  setScale(x: number, y?: number): unknown;
};

type AlphaRenderable = {
  setAlpha(alpha: number): unknown;
};

export class SleepVisualSystem implements System {
  update(world: World): void {
    for (const [, position, sleep, visual, renderable] of world.query(
      Position,
      SleepState,
      SleepVisual,
      Renderable,
    )) {
      const sprite = renderable.sprite as ScalableRenderable &
        Partial<AlphaRenderable>;

      if (!sleep.active) {
        visual.shadow.setVisible(false);
        visual.marker.setVisible(false);
        sprite.setScale(1, 1);
        sprite.setAlpha?.(1);
        continue;
      }

      const bob = Math.sin(sleep.elapsedSeconds * 5) * 5;

      sprite.setScale(1.35, 0.68);
      sprite.setAlpha?.(0.82);
      visual.shadow
        .setPosition(position.x, position.y + 18)
        .setScale(1 + Math.sin(sleep.elapsedSeconds * 3) * 0.04, 1)
        .setVisible(true);
      visual.marker
        .setPosition(position.x + 26, position.y - 70 + bob)
        .setText("Zzz")
        .setVisible(true);
    }
  }
}
