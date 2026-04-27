import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { Position } from "../../shared/components/Position";
import { SeedDrop } from "../components/SeedDrop";
import { SeedDropVisual } from "../components/SeedDropVisual";
import { plantDefinitions } from "../PlantDefinitions";
import {
  getPlantSpriteAssetBySeed,
  getSeedItemSpriteFrameIndex,
  plantSpriteTextureKeyBySeed,
} from "../PlantSpriteAssets";

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
    const spriteAsset = getPlantSpriteAssetBySeed(seedId);
    const textureKey = plantSpriteTextureKeyBySeed(seedId);
    const container = this.scene.add.container(0, 0).setDepth(7);
    const sprite =
      spriteAsset && textureKey
        ? this.scene.add.sprite(0, 0, textureKey).setOrigin(0.5)
        : undefined;
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
    if (sprite && spriteAsset) {
      const frameIndex = getSeedItemSpriteFrameIndex(spriteAsset);

      if (frameIndex !== undefined) {
        sprite
          .setFrame(frameIndex)
          .setDisplaySize(spriteAsset.manifest.cellSize, spriteAsset.manifest.cellSize);
        body.setVisible(false);
        label.setVisible(false);
      } else {
        sprite.setVisible(false);
      }
    }

    container.add([...(sprite ? [sprite] : []), body, label]);

    return new SeedDropVisual(container, sprite, body, label);
  }
}
