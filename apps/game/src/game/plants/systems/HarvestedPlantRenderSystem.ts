import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { Position } from "../../shared/components/Position";
import { HarvestedPlant } from "../components/HarvestedPlant";
import { HarvestedPlantVisual } from "../components/HarvestedPlantVisual";
import { plantDefinitions } from "../PlantDefinitions";

export class HarvestedPlantRenderSystem implements System {
  constructor(private readonly scene: Phaser.Scene) {}

  update(world: World): void {
    for (const [entity, position, harvested] of world.query(
      Position,
      HarvestedPlant,
    )) {
      const definition = plantDefinitions[harvested.plantId];

      if (!definition) {
        continue;
      }

      let visual = world.getComponent(entity, HarvestedPlantVisual);

      if (!visual) {
        visual = this.createVisual(definition.colors.grown);
        world.addComponent(entity, HarvestedPlantVisual, visual);
      }

      visual.container.setPosition(position.x, position.y);
    }
  }

  private createVisual(color: number): HarvestedPlantVisual {
    const container = this.scene.add.container(0, 0).setDepth(7);
    const stem = this.scene.add.rectangle(0, 8, 12, 36, 0x5f8f45, 1);
    const body = this.scene.add.ellipse(0, -12, 48, 36, color, 1);
    const marker = this.scene.add
      .text(0, -12, "!", {
        align: "center",
        color: "#101820",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "18px",
        fontStyle: "700",
      })
      .setOrigin(0.5);

    body.setStrokeStyle(2, 0xfff3a1, 0.75);
    container.add([stem, body, marker]);

    return new HarvestedPlantVisual(container, body, stem, marker);
  }
}
