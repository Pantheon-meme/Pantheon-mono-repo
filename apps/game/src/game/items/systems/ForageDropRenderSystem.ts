import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { Position } from "../../shared/components/Position";
import {
  forageItemSpriteTextureKey,
  getForageItemSpriteAsset,
  getForageItemSpriteCell,
} from "../ForageItemSpriteAssets";
import { itemColor } from "../ItemDefinitions";
import { ForageDrop } from "../components/ForageDrop";
import { ForageDropVisual } from "../components/ForageDropVisual";

export class ForageDropRenderSystem implements System {
  constructor(private readonly scene: Phaser.Scene) {}

  update(world: World): void {
    for (const [entity, position, drop] of world.query(Position, ForageDrop)) {
      let visual = world.getComponent(entity, ForageDropVisual);

      if (!visual) {
        visual = this.createVisual(drop.itemId);
        world.addComponent(entity, ForageDropVisual, visual);
      }

      visual.container.setPosition(position.x, position.y);
      visual.container.setAlpha(drop.pending ? 0.55 : 1);
      visual.container.setVisible(!drop.collected);
    }
  }

  private createVisual(itemId: string): ForageDropVisual {
    const color = itemColor(itemId);
    const spriteCell = getForageItemSpriteCell(itemId);
    const spriteAsset = getForageItemSpriteAsset(itemId);
    const textureKey = forageItemSpriteTextureKey(itemId);
    const sprite =
      spriteCell && spriteAsset && textureKey
        ? this.scene.add
            .sprite(0, 0, textureKey)
            .setOrigin(0.5)
        : undefined;
    const container = this.scene.add.container(0, 0).setDepth(7);
    const body = this.scene.add.ellipse(0, 0, 28, 20, color, 1);
    const glint = this.scene.add.star(0, -3, 4, 3, 8, 0xffffff, 0.82);
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
    if (sprite && spriteAsset && spriteCell) {
      const frameIndex =
        spriteCell.row * spriteAsset.manifest.columns + spriteCell.column;

      sprite
        .setFrame(frameIndex)
        .setDisplaySize(32, 32);
      body.setVisible(false);
      glint.setVisible(false);
      label.setVisible(false);
    }

    container.add([...(sprite ? [sprite] : []), body, glint, label]);

    return new ForageDropVisual(container, sprite, body, glint, label);
  }
}
