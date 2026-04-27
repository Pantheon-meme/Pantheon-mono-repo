import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { Position } from "../../shared/components/Position";
import { HarvestedPlant } from "../components/HarvestedPlant";
import { HarvestedPlantVisual } from "../components/HarvestedPlantVisual";
import { plantDefinitions } from "../PlantDefinitions";
import {
  getHarvestItemSpriteFrameIndex,
  getPlantSpriteAsset,
  plantSpriteTextureKey,
} from "../PlantSpriteAssets";

const harvestedAnimationFramesPerSecond = 2;

export class HarvestedPlantRenderSystem implements System {
  constructor(private readonly scene: Phaser.Scene) {}

  update(world: World, deltaSeconds: number): void {
    for (const [entity, position, harvested] of world.query(
      Position,
      HarvestedPlant,
    )) {
      const definition = plantDefinitions[harvested.plantId];

      if (!definition) {
        continue;
      }

      let visual = world.getComponent(entity, HarvestedPlantVisual);
      const spriteAsset = getPlantSpriteAsset(harvested.plantId);

      if (!visual) {
        visual = this.createVisual(
          harvested.plantId,
          definition.colors.grown,
          Boolean(spriteAsset),
        );
        world.addComponent(entity, HarvestedPlantVisual, visual);
      }

      visual.container.setPosition(position.x, position.y);

      if (spriteAsset) {
        renderHarvestedSprite(visual, spriteAsset, deltaSeconds);
      }
    }
  }

  private createVisual(
    plantId: string,
    color: number,
    useSprite: boolean,
  ): HarvestedPlantVisual {
    const container = this.scene.add.container(0, 0).setDepth(7);
    const sprite = useSprite
      ? this.scene.add.sprite(0, 0, plantSpriteTextureKey(plantId)).setOrigin(0.5)
      : undefined;
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
    stem.setVisible(!useSprite);
    body.setVisible(!useSprite);
    marker.setVisible(!useSprite);
    container.add([...(sprite ? [sprite] : []), stem, body, marker]);

    return new HarvestedPlantVisual(container, sprite, body, stem, marker);
  }
}

function renderHarvestedSprite(
  visual: HarvestedPlantVisual,
  spriteAsset: NonNullable<ReturnType<typeof getPlantSpriteAsset>>,
  deltaSeconds: number,
): void {
  if (!visual.sprite) {
    return;
  }

  visual.animationSeconds += deltaSeconds;
  const frame =
    Math.floor(visual.animationSeconds * harvestedAnimationFramesPerSecond) %
    spriteAsset.manifest.columns;
  const frameIndex = getHarvestItemSpriteFrameIndex(spriteAsset, frame);

  if (frameIndex === undefined || visual.renderedFrame === frame) {
    return;
  }

  visual.renderedFrame = frame;
  visual.sprite
    .setVisible(true)
    .setFrame(frameIndex)
    .setDisplaySize(spriteAsset.manifest.cellSize, spriteAsset.manifest.cellSize);
}
