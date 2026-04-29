import Phaser from "phaser";
import {
  objectSpriteAssets,
  type ObjectSpriteAsset,
} from "../../../assets/object-sprites/ObjectSpriteAssets";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { plantSpriteTextureKey } from "../../plants/PlantSpriteAssets";
import { isNearCameraView } from "../../shared/CameraCulling";
import { Position } from "../../shared/components/Position";
import { BiomeObject } from "../components/BiomeObject";
import { BiomeObjectVisual } from "../components/BiomeObjectVisual";

export class BiomeObjectRenderSystem implements System {
  private readonly objectSpriteRegistry: Record<string, ObjectSpriteAsset> =
    objectSpriteAssets;

  constructor(private readonly scene: Phaser.Scene) {}

  update(world: World): void {
    const camera = this.scene.cameras.main;

    for (const [entity, object, position] of world.query(BiomeObject, Position)) {
      const asset = this.objectSpriteRegistry[object.spriteSheetId];

      if (!asset) {
        continue;
      }

      let visual = world.getComponent(entity, BiomeObjectVisual);
      const visible = isNearCameraView(camera, position.x, position.y);

      if (!visible) {
        visual?.sprite.setVisible(false);
        continue;
      }

      if (!visual) {
        visual = new BiomeObjectVisual(
          this.scene.add
            .sprite(0, 0, plantSpriteTextureKey(object.spriteSheetId))
            .setOrigin(0.5, object.groundOriginY),
        );
        world.addComponent(entity, BiomeObjectVisual, visual);
      }

      const frameIndex = object.row * asset.manifest.columns + object.column;

      visual.sprite
        .setVisible(true)
        .setPosition(position.x, position.y)
        .setFrame(frameIndex)
        .setDisplaySize(
          asset.manifest.cellSize * object.scale,
          asset.manifest.cellSize * object.scale,
        );
    }
  }
}
