import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { PlantState, type PlantStage } from "../components/PlantState";
import { PlantVisual } from "../components/PlantVisual";
import { Position } from "../../shared/components/Position";
import { plantDefinitions } from "../PlantDefinitions";

export class PlantRenderSystem implements System {
  constructor(private readonly scene: Phaser.Scene) {}

  update(world: World): void {
    for (const [entity, plant, position] of world.query(PlantState, Position)) {
      const definition = plantDefinitions[plant.plantId];

      if (!definition) {
        continue;
      }

      let visual = world.getComponent(entity, PlantVisual);

      if (!visual) {
        visual = this.createVisual();
        world.addComponent(entity, PlantVisual, visual);
      }

      visual.container.setPosition(position.x, position.y);

      if (visual.renderedStage !== plant.stage) {
        renderStage(visual, plant.stage, definition.colors[plant.stage]);
      }
    }
  }

  private createVisual(): PlantVisual {
    const container = this.scene.add.container(0, 0).setDepth(8);
    const stem = this.scene.add.rectangle(0, 0, 14, 46, 0x7dbd47, 1);
    const body = this.scene.add.ellipse(0, 0, 52, 52, 0xd8a541, 1);
    const marker = this.scene.add
      .text(0, 0, "", {
        align: "center",
        color: "#101820",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "22px",
        fontStyle: "700",
      })
      .setOrigin(0.5);

    container.add([stem, body, marker]);

    return new PlantVisual(container, body, stem, marker);
  }
}

function renderStage(
  visual: PlantVisual,
  stage: PlantStage,
  color: number,
): void {
  visual.renderedStage = stage;
  visual.body.setFillStyle(color, stage === "fetched" ? 0.55 : 1);
  visual.stem.setFillStyle(color, stage === "fetched" ? 0.35 : 1);

  if (stage === "seed") {
    visual.body.setSize(28, 20);
    visual.body.setPosition(0, 10);
    visual.stem.setVisible(false);
    visual.marker.setText("*").setPosition(0, 10);
  } else if (stage === "growing") {
    visual.body.setSize(38, 38);
    visual.body.setPosition(0, -18);
    visual.stem.setSize(12, 42).setPosition(0, 2).setVisible(true);
    visual.marker.setText("~").setPosition(0, -18);
  } else if (stage === "grown") {
    visual.body.setSize(58, 58);
    visual.body.setPosition(0, -28);
    visual.stem.setSize(16, 58).setPosition(0, 0).setVisible(true);
    visual.marker.setText("!").setPosition(0, -28);
  } else {
    visual.body.setSize(48, 18);
    visual.body.setPosition(0, 12);
    visual.stem.setSize(12, 30).setPosition(0, 0).setVisible(true);
    visual.marker.setText("").setPosition(0, 0);
  }
}
