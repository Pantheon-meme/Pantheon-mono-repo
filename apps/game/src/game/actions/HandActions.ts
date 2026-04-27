import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { FacingDirection } from "../player/components/FacingDirection";
import { FocusTarget } from "../player/components/FocusTarget";
import { Grabbable } from "../shared/components/Grabbable";
import { Hands, type HandId } from "../player/components/Hands";
import { HeldItem } from "../player/components/HeldItem";
import { ItemUseConstraints } from "../shared/components/ItemUseConstraints";
import { Position } from "../shared/components/Position";
import { SeedDrop } from "../plants/components/SeedDrop";
import { TerrainGrid } from "../terrain/components/TerrainGrid";
import { WeightInspectable } from "../shared/components/WeightInspectable";
import { WeightedObject } from "../shared/components/WeightedObject";
import { getPlantBySeed } from "../plants/PlantDefinitions";
import { getFacingTargetCell } from "../terrain/GridTargeting";
import { getTopTerrainLayerAtCell } from "../terrain/TerrainLayers";
import {
  createPlantEntity,
  findPlantAt,
  formatLayerName,
  handLabel,
  seedLabel,
} from "./ActionHelpers";
import type { ActionDefinition, ActionEffectResult } from "./ActionTypes";

export const handActionDefinitions: Record<string, ActionDefinition> = {
  "left-hand-toggle": {
    id: "left-hand-toggle",
    label: "Left hand",
    energyDelta: 0,
    apply: (world, actor) => toggleHand(world, actor, "left"),
  },
  "left-hand-use": {
    id: "left-hand-use",
    label: "Use left hand",
    energyDelta: 0,
    apply: (world, actor) => useHand(world, actor, "left"),
  },
  "right-hand-toggle": {
    id: "right-hand-toggle",
    label: "Right hand",
    energyDelta: 0,
    apply: (world, actor) => toggleHand(world, actor, "right"),
  },
  "right-hand-use": {
    id: "right-hand-use",
    label: "Use right hand",
    energyDelta: 0,
    apply: (world, actor) => useHand(world, actor, "right"),
  },
};

function toggleHand(
  world: World,
  actor: Entity,
  hand: HandId,
): ActionEffectResult {
  const hands = world.getComponent(actor, Hands);
  const slot = hands?.get(hand);

  if (!hands || !slot) {
    return { message: `${handLabel(hand)} hand: unavailable`, applied: false };
  }

  if (slot.held) {
    return dropFromHand(world, actor, hand);
  }

  return grabIntoHand(world, actor, hand);
}

function grabIntoHand(
  world: World,
  actor: Entity,
  hand: HandId,
): ActionEffectResult {
  const hands = world.getComponent(actor, Hands);
  const focus = world.getComponent(actor, FocusTarget);
  const slot = hands?.get(hand);

  if (!hands || !slot || !focus || focus.kind !== "object" || !focus.object) {
    return {
      message: `${handLabel(hand)} hand: no object focused`,
      applied: false,
    };
  }

  if (world.getComponent(focus.object, HeldItem)) {
    return { message: `${focus.objectLabel} is already held`, applied: false };
  }

  const weight = world.getComponent(focus.object, WeightedObject);
  const grabbable = world.getComponent(focus.object, Grabbable);

  if (!weight || !grabbable) {
    return { message: `${focus.objectLabel} cannot be held`, applied: false };
  }

  if (weight.weight > hands.maxHandWeight) {
    return {
      message: `${focus.objectLabel} is too heavy for one hand`,
      applied: false,
    };
  }

  slot.held = focus.object;
  world.addComponent(focus.object, HeldItem, new HeldItem(actor, hand));

  return { message: `${handLabel(hand)} hand grabbed ${focus.objectLabel}` };
}

function dropFromHand(
  world: World,
  actor: Entity,
  hand: HandId,
): ActionEffectResult {
  const hands = world.getComponent(actor, Hands);
  const position = world.getComponent(actor, Position);
  const facing = world.getComponent(actor, FacingDirection);
  const grid = world.query(TerrainGrid)[0]?.[1];
  const slot = hands?.get(hand);
  const held = slot?.held;

  if (!hands || !slot || !held) {
    return { message: `${handLabel(hand)} hand is empty`, applied: false };
  }

  const heldPosition = world.getComponent(held, Position);
  const label = world.getComponent(held, WeightInspectable)?.label ?? "object";

  if (heldPosition && position && facing && grid) {
    const target = getFacingTargetCell(grid, position, facing);
    heldPosition.x = target.x * grid.tileSize + grid.tileSize / 2;
    heldPosition.y = target.y * grid.tileSize + grid.tileSize / 2;
  }

  world.removeComponent(held, HeldItem);
  slot.held = undefined;

  return { message: `${handLabel(hand)} hand dropped ${label}` };
}

function useHand(
  world: World,
  actor: Entity,
  hand: HandId,
): ActionEffectResult {
  const hands = world.getComponent(actor, Hands);
  const focus = world.getComponent(actor, FocusTarget);
  const slot = hands?.get(hand);
  const held = slot?.held;

  if (!hands || !slot || !held) {
    return { message: `${handLabel(hand)} hand is empty`, applied: false };
  }

  const seedDrop = world.getComponent(held, SeedDrop);

  if (seedDrop && !seedDrop.collected) {
    return useHeldSeed(world, actor, hand, held, seedDrop, focus);
  }

  const label = world.getComponent(held, WeightInspectable)?.label ?? "object";

  return {
    message: `${handLabel(hand)} hand: ${label} has no use yet`,
    applied: false,
  };
}

function useHeldSeed(
  world: World,
  actor: Entity,
  hand: HandId,
  held: Entity,
  seedDrop: SeedDrop,
  focus: FocusTarget | undefined,
): ActionEffectResult {
  const hands = world.getComponent(actor, Hands);
  const slot = hands?.get(hand);
  const grid = world.query(TerrainGrid)[0]?.[1];
  const definition = getPlantBySeed(seedDrop.seedId);

  if (!hands || !slot || !grid || !definition) {
    return {
      message: `${handLabel(hand)} hand: seed cannot be used`,
      applied: false,
    };
  }

  if (!focus || focus.kind !== "tile") {
    return {
      message: `${handLabel(hand)} hand: choose a tile for ${seedLabel(seedDrop.seedId)}`,
      applied: false,
    };
  }

  const constraintMessage = validateUseConstraints(world, held, focus);

  if (constraintMessage) {
    return {
      message: `${handLabel(hand)} hand: ${constraintMessage}`,
      applied: false,
    };
  }

  if (findPlantAt(world, focus.tileX, focus.tileY, false)) {
    return {
      message: `${handLabel(hand)} hand: tile already has a plant`,
      applied: false,
    };
  }

  createPlantEntity(world, grid.tileSize, focus.tileX, focus.tileY, definition);

  seedDrop.collected = true;
  world.removeComponent(held, HeldItem);
  slot.held = undefined;

  const heldPosition = world.getComponent(held, Position);

  if (heldPosition) {
    heldPosition.x = -999999;
    heldPosition.y = -999999;
  }

  return {
    message: `${handLabel(hand)} hand planted ${definition.label}`,
  };
}

function validateUseConstraints(
  world: World,
  item: Entity,
  focus: FocusTarget,
): string | undefined {
  const constraints = world.getComponent(item, ItemUseConstraints);

  if (!constraints?.requiredTerrainLayerId) {
    return undefined;
  }

  const activeLayer = getTopTerrainLayerAtCell(world, focus.tileX, focus.tileY)
    ?.layer.id;

  if (activeLayer !== constraints.requiredTerrainLayerId) {
    return `requires ${formatLayerName(constraints.requiredTerrainLayerId)} tile`;
  }

  return undefined;
}
