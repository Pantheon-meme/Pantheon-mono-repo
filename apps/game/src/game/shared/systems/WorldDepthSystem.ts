import type Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { BiomeObjectVisual } from "../../biome/components/BiomeObjectVisual";
import { PlayerControlled } from "../../player/components/PlayerControlled";
import { PlantVisual } from "../../plants/components/PlantVisual";
import { TerrainGrid } from "../../terrain/components/TerrainGrid";
import { Position } from "../components/Position";
import { Renderable } from "../components/Renderable";

type DepthableGameObject = Phaser.GameObjects.Components.Depth &
  Phaser.GameObjects.Components.Transform;

const worldDepthBase = 20;
const worldDepthScale = 0.0001;
export const playerDepthSortYOffsetRatio = 0.5;

export class WorldDepthSystem implements System {
  update(world: World): void {
    const tileSize = world.query(TerrainGrid)[0]?.[1].tileSize ?? 256;

    for (const [, position, renderable] of world.query(
      Position,
      Renderable,
      PlayerControlled,
    )) {
      const sprite = renderable.sprite as Partial<DepthableGameObject>;

      sprite.setDepth?.(
        getWorldDepth(getPlayerWorldDepthGroundY(position.y, tileSize)),
      );
    }

    for (const [, position, visual] of world.query(Position, PlantVisual)) {
      visual.container.setDepth(getWorldDepth(position.y));
    }

    for (const [, position, visual] of world.query(Position, BiomeObjectVisual)) {
      visual.sprite.setDepth(getWorldDepth(position.y));
    }
  }
}

export function getPlayerWorldDepthGroundY(
  playerY: number,
  tileSize: number,
): number {
  return playerY - tileSize * playerDepthSortYOffsetRatio;
}

export function getWorldDepth(groundY: number): number {
  return worldDepthBase + groundY * worldDepthScale;
}
