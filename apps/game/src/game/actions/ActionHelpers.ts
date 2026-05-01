import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { Footprint } from "../shared/components/Footprint";
import type { HandId } from "../player/components/Hands";
import { PlantState } from "../plants/components/PlantState";
import { Position } from "../shared/components/Position";
import { WeightInspectable } from "../shared/components/WeightInspectable";
import { WeightedObject } from "../shared/components/WeightedObject";
import {
  plantDefinitions,
  type PlantDefinition,
} from "../plants/PlantDefinitions";
import { PlantCareState } from "../plants/components/PlantCareState";

export function formatLayerName(layerId: string): string {
  return layerId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function seedLabel(seedId: string): string {
  return (
    Object.values(plantDefinitions).find(
      (definition) => definition.seedId === seedId,
    )?.seedLabel ?? seedId
  );
}

export function handLabel(hand: HandId): string {
  return hand === "left" ? "Left" : "Right";
}

export function findPlantAt(
  world: World,
  tileX: number,
  tileY: number,
  grownOnly: boolean,
): { entity: Entity; plant: PlantState } | undefined {
  for (const [entity, plant] of world.query(PlantState)) {
    if (plant.tileX !== tileX || plant.tileY !== tileY) {
      continue;
    }

    if (grownOnly && plant.stage !== "grown") {
      continue;
    }

    if (!grownOnly && plant.stage === "fetched") {
      continue;
    }

    return { entity, plant };
  }

  return undefined;
}

export function findPlantByEntity(
  world: World,
  entity: Entity,
  grownOnly: boolean,
): { entity: Entity; plant: PlantState } | undefined {
  const plant = world.getComponent(entity, PlantState);

  if (!plant) {
    return undefined;
  }

  if (grownOnly && plant.stage !== "grown") {
    return undefined;
  }

  if (!grownOnly && plant.stage === "fetched") {
    return undefined;
  }

  return { entity, plant };
}

export function createPlantEntity(
  world: World,
  tileSize: number,
  tileX: number,
  tileY: number,
  definition: PlantDefinition,
): Entity {
  const plant = world.createEntity();

  world.addComponent(
    plant,
    Position,
    new Position(
      tileX * tileSize + tileSize / 2,
      tileY * tileSize + tileSize / 2,
    ),
  );
  world.addComponent(
    plant,
    PlantState,
    new PlantState(definition.id, tileX, tileY),
  );
  world.addComponent(plant, PlantCareState, new PlantCareState());
  world.addComponent(
    plant,
    Footprint,
    new Footprint(definition.footprint.width, definition.footprint.height),
  );
  world.addComponent(
    plant,
    WeightedObject,
    new WeightedObject(definition.plantWeight),
  );
  world.addComponent(
    plant,
    WeightInspectable,
    new WeightInspectable(`${definition.label} ${definition.kind}`),
  );

  return plant;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
