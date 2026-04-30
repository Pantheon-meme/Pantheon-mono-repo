import Phaser from "phaser";
import type { Entity } from "../../../ecs/World";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { ActionProgress } from "../../actions/components/ActionProgress";
import { OnchainPresentation } from "../../mud/components/OnchainPresentation";
import { Renderable } from "../../shared/components/Renderable";
import { Velocity } from "../../shared/components/Velocity";
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
const defaultOriginY = 1;
const sleepOriginY = 0.82;

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

      const velocity = world.getComponent(entity, Velocity);
      const presentation = world.getComponent(entity, OnchainPresentation);
      const moving =
        input.directionX !== 0 ||
        input.directionY !== 0 ||
        Math.abs(velocity?.x ?? 0) > 1 ||
        Math.abs(velocity?.y ?? 0) > 1;
      const direction = getDirection(facing);
      const action = moving ? "walk" : "idle";
      const elapsedSeconds = (this.animationSecondsByEntity.get(entity) ?? 0) + deltaSeconds;
      const frame = Math.floor(elapsedSeconds * (moving ? walkFramesPerSecond : idleFramesPerSecond));
      const sleep = world.getComponent(entity, SleepState);
      const progress = world.getComponent(entity, ActionProgress);
      updatePresentation(presentation, deltaSeconds);
      const sleeping = sleep?.active || presentation?.pose === "sleep";
      const frameIndex = sleeping
        ? getPlayerSpecialSpriteFrameIndex(spriteAsset, direction, "sleep")
        : progress?.active || presentation?.pose === "action"
          ? getPlayerSpecialSpriteFrameIndex(spriteAsset, direction, "action")
          : getPlayerSpriteFrameIndex(spriteAsset, direction, action, frame);

      this.animationSecondsByEntity.set(entity, elapsedSeconds);

      if (frameIndex === undefined) {
        continue;
      }

      renderable.sprite
        .setFrame(frameIndex)
        .setFlipX(direction === "side" && facing.x < 0)
        .setOrigin(0.5, sleeping ? sleepOriginY : defaultOriginY)
        .setDisplaySize(spriteAsset.manifest.cellSize, spriteAsset.manifest.cellSize);
    }
  }
}

function updatePresentation(
  presentation: OnchainPresentation | undefined,
  deltaSeconds: number,
): void {
  if (!presentation?.active) {
    return;
  }

  presentation.elapsedSeconds += deltaSeconds;

  if (presentation.elapsedSeconds >= presentation.durationSeconds) {
    presentation.clear();
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
