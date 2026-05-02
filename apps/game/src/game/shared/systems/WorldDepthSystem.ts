import type Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { BiomeObjectVisual } from "../../biome/components/BiomeObjectVisual";
import { PlayerAvatar } from "../../player/components/PlayerAvatar";
import { PlantVisual } from "../../plants/components/PlantVisual";
import { TerrainGrid } from "../../terrain/components/TerrainGrid";
import { Position } from "../components/Position";
import { Renderable } from "../components/Renderable";

type DepthableGameObject = Phaser.GameObjects.Components.Depth &
  Phaser.GameObjects.Components.Transform;

const worldDepthBase = 20;
const worldDepthScale = 0.0001;
const playerDepthSortYOffsetRatio = 0.5;

export class WorldDepthSystem implements System {
  update(world: World): void {
    const tileSize = world.query(TerrainGrid)[0]?.[1].tileSize ?? 256;
    const playerDepthSortYOffset = tileSize * playerDepthSortYOffsetRatio;

    for (const [, position, renderable] of world.query(
      Position,
      Renderable,
      PlayerAvatar,
    )) {
      const sprite = renderable.sprite as Partial<DepthableGameObject>;

      sprite.setDepth?.(getWorldDepth(position.y - playerDepthSortYOffset));
    }

    for (const [, position, visual] of world.query(Position, PlantVisual)) {
      visual.container.setDepth(getWorldDepth(position.y));
    }

    for (const [, position, visual] of world.query(Position, BiomeObjectVisual)) {
      visual.sprite.setDepth(getWorldDepth(position.y));
    }
  }
}

function getWorldDepth(groundY: number): number {
  return worldDepthBase + groundY * worldDepthScale;
}
