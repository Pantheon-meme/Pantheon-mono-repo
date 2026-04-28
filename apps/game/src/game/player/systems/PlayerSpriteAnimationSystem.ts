import Phaser from "phaser";
import type { Entity } from "../../../ecs/World";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { ActionProgress } from "../../actions/components/ActionProgress";
import { Renderable } from "../../shared/components/Renderable";
import { SleepState } from "../../sleep/components/SleepState";
import { FacingDirection } from "../components/FacingDirection";
import { InputState } from "../components/InputState";
import { PlayerControlled } from "../components/PlayerControlled";
import {
  getPlayerSpriteAsset,
  getPlayerSpriteFrameIndex,
  getPlayerSpecialSpriteFrameIndex,
  type PlayerSpriteDirection,
} from "../PlayerSpriteAssets";

const walkFramesPerSecond = 8;
const idleFramesPerSecond = 2;

export class PlayerSpriteAnimationSystem implements System {
  private readonly animationSecondsByEntity = new Map<Entity, number>();

  update(world: World, deltaSeconds: number): void {
    const spriteAsset = getPlayerSpriteAsset();

    if (!spriteAsset) {
      return;
    }

    for (const [entity, , input, facing, renderable] of world.query(
      PlayerControlled,
      InputState,
      FacingDirection,
      Renderable,
    )) {
      if (!(renderable.sprite instanceof Phaser.GameObjects.Sprite)) {
        continue;
      }

      const moving = input.directionX !== 0 || input.directionY !== 0;
      const direction = getDirection(facing);
      const action = moving ? "walk" : "idle";
      const elapsedSeconds = (this.animationSecondsByEntity.get(entity) ?? 0) + deltaSeconds;
      const frame = Math.floor(elapsedSeconds * (moving ? walkFramesPerSecond : idleFramesPerSecond));
      const sleep = world.getComponent(entity, SleepState);
      const progress = world.getComponent(entity, ActionProgress);
      const frameIndex = sleep?.active
        ? getPlayerSpecialSpriteFrameIndex(spriteAsset, direction, "sleep")
        : progress?.active
          ? getPlayerSpecialSpriteFrameIndex(spriteAsset, direction, "action")
          : getPlayerSpriteFrameIndex(spriteAsset, direction, action, frame);

      this.animationSecondsByEntity.set(entity, elapsedSeconds);

      if (frameIndex === undefined) {
        continue;
      }

      renderable.sprite
        .setFrame(frameIndex)
        .setFlipX(direction === "side" && facing.x < 0)
        .setOrigin(0.5, 1)
        .setDisplaySize(spriteAsset.manifest.cellSize, spriteAsset.manifest.cellSize);
    }
  }
}

function getDirection(facing: FacingDirection): PlayerSpriteDirection {
  if (facing.y < 0) {
    return "up";
  }

  if (facing.y > 0) {
    return "down";
  }

  return "side";
}
