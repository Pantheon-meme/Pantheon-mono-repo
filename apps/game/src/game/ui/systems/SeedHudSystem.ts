import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { SeedHud } from "../components/SeedHud";
import { SeedPouch } from "../../plants/components/SeedPouch";
import { plantDefinitions } from "../../plants/PlantDefinitions";

export class SeedHudSystem implements System {
  update(world: World): void {
    const pouch = world.query(SeedPouch)[0]?.[1];

    for (const [, hud] of world.query(SeedHud)) {
      const camera = hud.label.scene.cameras.main;
      const scale = 1 / camera.zoom;
      const worldX = camera.worldView.x + hud.screenX * scale;
      const worldY = camera.worldView.y + hud.screenY * scale;

      hud.label.setPosition(worldX, worldY);
      hud.label.setScale(scale);

      if (!pouch) {
        hud.label.setText("Seeds: none");
        continue;
      }

      const activePlant = Object.values(plantDefinitions).find(
        (definition) => definition.seedId === pouch.activeSeedId,
      );
      const seedLines = Object.values(plantDefinitions)
        .map(
          (definition) =>
            `${definition.seedLabel}: ${pouch.count(definition.seedId)}`,
        )
        .join("  ");

      hud.label.setText(
        `Seeds [C ${activePlant?.seedLabel ?? "None"}]\n${seedLines}`,
      );
    }
  }
}
