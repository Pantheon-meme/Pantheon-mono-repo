import type { System } from "../../ecs/System";
import type { World } from "../../ecs/World";
import { HandHud } from "../components/HandHud";
import { Hands, type HandId } from "../components/Hands";
import { WeightInspectable } from "../components/WeightInspectable";
import { WeightedObject } from "../components/WeightedObject";

export class HandHudSystem implements System {
  update(world: World): void {
    const hands = world.query(Hands)[0]?.[1];

    for (const [, hud] of world.query(HandHud)) {
      const camera = hud.label.scene.cameras.main;
      const scale = 1 / camera.zoom;
      const worldX = camera.worldView.x + hud.screenX * scale;
      const worldY = camera.worldView.y + hud.screenY * scale;

      hud.label.setPosition(worldX, worldY);
      hud.label.setScale(scale);

      if (!hands) {
        hud.label.setText("Hands unavailable");
        continue;
      }

      hud.label.setText(
        `Left [1 grab/drop, 2 use]: ${handLabel(world, hands, "left")}\nRight [3 grab/drop, 4 use]: ${handLabel(world, hands, "right")}`,
      );
    }
  }
}

function handLabel(world: World, hands: Hands, hand: HandId): string {
  const held = hands.get(hand).held;

  if (!held) {
    return "empty";
  }

  const inspectable = world.getComponent(held, WeightInspectable);
  const weight = world.getComponent(held, WeightedObject);

  return `${inspectable?.label ?? "object"} (${weight?.weight ?? 0} kg)`;
}
