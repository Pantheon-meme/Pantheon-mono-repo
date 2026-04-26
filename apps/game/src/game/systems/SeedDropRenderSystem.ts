import Phaser from "phaser";
import type { System } from "../../ecs/System";
import type { World } from "../../ecs/World";
import { Position } from "../components/Position";
import { SeedDrop } from "../components/SeedDrop";
import { SeedDropVisual } from "../components/SeedDropVisual";
import { plantDefinitions } from "../plants/PlantDefinitions";

export class SeedDropRenderSystem implements System {
  constructor(private readonly scene: Phaser.Scene) {}

  update(world: World): void {
    for (const [entity, position, drop] of world.query(Position, SeedDrop)) {
      let visual = world.getComponent(entity, SeedDropVisual);

      if (!visual) {
        visual = this.createVisual(drop.seedId);
        world.addComponent(entity, SeedDropVisual, visual);
      }

      visual.container.setPosition(position.x, position.y);
      visual.container.setVisible(!drop.collected);
    }
  }

  private createVisual(seedId: string): SeedDropVisual {
    const definition = Object.values(plantDefinitions).find(
      (plant) => plant.seedId === seedId,
    );
    const container = this.scene.add.container(0, 0).setDepth(7);
    const body = this.scene.add.ellipse(
      0,
      0,
      26,
      18,
      definition?.colors.seed ?? 0xd8a541,
      1,
    );
    const label = this.scene.add
      .text(0, 0, ".", {
        align: "center",
        color: "#101820",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "18px",
        fontStyle: "700",
      })
      .setOrigin(0.5);

    body.setStrokeStyle(2, 0xfff3a1, 0.75);
    container.add([body, label]);

    return new SeedDropVisual(container, body, label);
  }
}
