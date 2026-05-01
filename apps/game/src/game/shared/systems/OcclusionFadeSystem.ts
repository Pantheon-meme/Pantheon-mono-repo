import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { BiomeObject } from "../../biome/components/BiomeObject";
import { BiomeObjectVisual } from "../../biome/components/BiomeObjectVisual";
import { PlayerControlled } from "../../player/components/PlayerControlled";
import { PlantState } from "../../plants/components/PlantState";
import { PlantVisual } from "../../plants/components/PlantVisual";
import { plantDefinitions } from "../../plants/PlantDefinitions";
import { TerrainGrid } from "../../terrain/components/TerrainGrid";
import { Footprint } from "../components/Footprint";
import { Position } from "../components/Position";
import { Renderable } from "../components/Renderable";
import { getPlayerWorldDepthGroundY } from "./WorldDepthSystem";

type BoundsSource = {
  getBounds(output?: Phaser.Geom.Rectangle): Phaser.Geom.Rectangle;
};

type FadableBoundsSource = BoundsSource & {
  alpha: number;
  visible: boolean;
  setAlpha(alpha: number): unknown;
};

const occludedAlpha = 0.44;
const fadeResponse = 14;
const largeObjectScaleThreshold = 1.22;
const largeFootprintRatio = 1.1;

export class OcclusionFadeSystem implements System {
  private readonly playerBounds = new Phaser.Geom.Rectangle();
  private readonly occluderBounds = new Phaser.Geom.Rectangle();

  update(world: World, deltaSeconds: number): void {
    const player = world.query(Position, Renderable, PlayerControlled)[0];

    if (!player) {
      return;
    }

    const [, playerPosition, renderable] = player;
    const tileSize = world.query(TerrainGrid)[0]?.[1].tileSize ?? 256;
    const playerDepthGroundY = getPlayerWorldDepthGroundY(
      playerPosition.y,
      tileSize,
    );
    const playerBounds = getPlayerOcclusionBounds(
      renderable.sprite,
      playerPosition,
      tileSize,
      this.playerBounds,
    );

    for (const [, position, plant, visual] of world.query(
      Position,
      PlantState,
      PlantVisual,
    )) {
      const definition = plantDefinitions[plant.plantId];
      const shouldFade =
        definition?.kind === "tree" &&
        isBlockingPlayer(
          visual.container,
          position.y,
          playerDepthGroundY,
          playerBounds,
          this.occluderBounds,
        );

      fadeTo(visual.container, shouldFade ? occludedAlpha : 1, deltaSeconds);
    }

    for (const [, position, object, footprint, visual] of world.query(
      Position,
      BiomeObject,
      Footprint,
      BiomeObjectVisual,
    )) {
      const shouldFade =
        isLargeBiomeObject(object, footprint, tileSize) &&
        isBlockingPlayer(
          visual.sprite,
          position.y,
          playerDepthGroundY,
          playerBounds,
          this.occluderBounds,
        );

      fadeTo(visual.sprite, shouldFade ? occludedAlpha : 1, deltaSeconds);
    }
  }
}

function isBlockingPlayer(
  occluder: FadableBoundsSource,
  occluderGroundY: number,
  playerDepthGroundY: number,
  playerBounds: Phaser.Geom.Rectangle,
  occluderBounds: Phaser.Geom.Rectangle,
): boolean {
  if (!occluder.visible || occluderGroundY <= playerDepthGroundY) {
    return false;
  }

  getOccluderBounds(occluder, occluderBounds);

  return Phaser.Geom.Rectangle.Overlaps(playerBounds, occluderBounds);
}

function getPlayerOcclusionBounds(
  gameObject: unknown,
  position: Position,
  tileSize: number,
  output: Phaser.Geom.Rectangle,
): Phaser.Geom.Rectangle {
  if (hasBounds(gameObject)) {
    gameObject.getBounds(output);
  } else {
    output.setTo(
      position.x - tileSize * 0.18,
      position.y - tileSize * 0.72,
      tileSize * 0.36,
      tileSize * 0.64,
    );
  }

  const insetX = Math.min(output.width * 0.28, tileSize * 0.22);
  const insetTop = Math.min(output.height * 0.12, tileSize * 0.12);
  const insetBottom = Math.min(output.height * 0.08, tileSize * 0.08);

  output.x += insetX;
  output.y += insetTop;
  output.width = Math.max(1, output.width - insetX * 2);
  output.height = Math.max(1, output.height - insetTop - insetBottom);

  return output;
}

function getOccluderBounds(
  occluder: BoundsSource,
  output: Phaser.Geom.Rectangle,
): Phaser.Geom.Rectangle {
  occluder.getBounds(output);

  const insetX = output.width * 0.16;
  const insetTop = output.height * 0.08;

  output.x += insetX;
  output.y += insetTop;
  output.width = Math.max(1, output.width - insetX * 2);
  output.height = Math.max(1, output.height - insetTop);

  return output;
}

function isLargeBiomeObject(
  object: BiomeObject,
  footprint: Footprint,
  tileSize: number,
): boolean {
  return (
    object.scale >= largeObjectScaleThreshold ||
    footprint.width >= tileSize * largeFootprintRatio ||
    footprint.height >= tileSize * largeFootprintRatio
  );
}

function fadeTo(
  target: FadableBoundsSource,
  targetAlpha: number,
  deltaSeconds: number,
): void {
  const blend = 1 - Math.exp(-fadeResponse * Math.max(0, deltaSeconds));
  const nextAlpha = Phaser.Math.Linear(target.alpha, targetAlpha, blend);

  target.setAlpha(
    Math.abs(nextAlpha - targetAlpha) < 0.01 ? targetAlpha : nextAlpha,
  );
}

function hasBounds(value: unknown): value is BoundsSource {
  return (
    typeof value === "object" &&
    value !== null &&
    "getBounds" in value &&
    typeof value.getBounds === "function"
  );
}
