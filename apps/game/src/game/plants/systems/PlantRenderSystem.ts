import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { PlantState, type PlantStage } from "../components/PlantState";
import { PlantVisual } from "../components/PlantVisual";
import { Position } from "../../shared/components/Position";
import { plantDefinitions } from "../PlantDefinitions";
import {
  getPlantSpriteAsset,
  getPlantSpriteFrameIndex,
  plantSpriteTextureKey,
} from "../PlantSpriteAssets";

const spriteTileVisualYOffsetRatio = 0.48;

export class PlantRenderSystem implements System {
  constructor(private readonly scene: Phaser.Scene) {}

  update(world: World): void {
    for (const [entity, plant, position] of world.query(PlantState, Position)) {
      const definition = plantDefinitions[plant.plantId];

      if (!definition) {
        continue;
      }

      let visual = world.getComponent(entity, PlantVisual);
      const spriteAsset = getPlantSpriteAsset(plant.plantId);

      if (!visual) {
        visual = this.createVisual(plant.plantId, Boolean(spriteAsset));
        world.addComponent(entity, PlantVisual, visual);
      }

      visual.container.setPosition(position.x, position.y);

      if (spriteAsset) {
        renderSpriteStage(visual, spriteAsset, plant, definition);
      } else if (visual.renderedStage !== plant.stage) {
        renderStage(visual, plant.stage, definition.colors[plant.stage]);
      }
    }
  }

  private createVisual(plantId: string, useSprite: boolean): PlantVisual {
    const container = this.scene.add.container(0, 0).setDepth(8);
    const sprite = useSprite
      ? this.scene.add
          .sprite(0, 0, plantSpriteTextureKey(plantId))
          .setOrigin(0.5, 1)
      : undefined;
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

    stem.setVisible(!useSprite);
    body.setVisible(!useSprite);
    marker.setVisible(!useSprite);
    container.add([...(sprite ? [sprite] : []), stem, body, marker]);

    return new PlantVisual(container, sprite, body, stem, marker);
  }
}

function renderSpriteStage(
  visual: PlantVisual,
  spriteAsset: NonNullable<ReturnType<typeof getPlantSpriteAsset>>,
  plant: PlantState,
  definition: NonNullable<(typeof plantDefinitions)[string]>,
): void {
  if (!visual.sprite) {
    return;
  }

  const frame = getStageFrame(
    plant,
    definition,
    spriteAsset.manifest.columns,
    visual.grownVariantFrame,
  );
  const frameIndex = getPlantSpriteFrameIndex(spriteAsset, plant.stage, frame);

  if (frameIndex === undefined) {
    return;
  }

  if (visual.renderedStage === plant.stage && visual.renderedFrame === frame) {
    return;
  }

  visual.renderedStage = plant.stage;
  visual.renderedFrame = frame;
  visual.sprite
    .setVisible(true)
    .setPosition(
      0,
      spriteAsset.manifest.cellSize *
        definition.visualScale *
        spriteTileVisualYOffsetRatio,
    )
    .setFrame(frameIndex)
    .setDisplaySize(
      spriteAsset.manifest.cellSize * definition.visualScale,
      spriteAsset.manifest.cellSize * definition.visualScale,
    )
    .setAlpha(plant.stage === "fetched" ? 0.82 : 1);
}

function getStageFrame(
  plant: PlantState,
  definition: NonNullable<(typeof plantDefinitions)[string]>,
  columns: number,
  grownVariantFrame: number,
): number {
  if (plant.stage === "grown") {
    return grownVariantFrame % columns;
  }

  if (plant.stage === "fetched") {
    return 0;
  }

  if (plant.stage === "seed") {
    const plantedColumns = Math.max(1, columns - 1);
    const seedEnd = definition.growthSeconds * definition.growthThresholds.seed;
    const stageProgress = Phaser.Math.Clamp(
      plant.elapsedSeconds / Math.max(seedEnd, 0.001),
      0,
      0.999,
    );

    return Math.min(
      columns - 1,
      1 + Math.floor(stageProgress * plantedColumns),
    );
  }

  const stageStart =
    plant.stage === "growing"
      ? definition.growthSeconds * definition.growthThresholds.seed
      : 0;
  const stageEnd =
    plant.stage === "growing"
      ? definition.growthSeconds * definition.growthThresholds.growing
      : definition.growthSeconds * definition.growthThresholds.seed;
  const stageProgress = Phaser.Math.Clamp(
    (plant.elapsedSeconds - stageStart) /
      Math.max(stageEnd - stageStart, 0.001),
    0,
    0.999,
  );

  return Math.min(columns - 1, Math.floor(stageProgress * columns));
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
