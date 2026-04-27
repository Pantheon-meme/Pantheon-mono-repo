import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { Hands, type HandId } from "../player/components/Hands";
import { FocusTarget } from "../player/components/FocusTarget";
import { HeldItem } from "../player/components/HeldItem";
import { SeedDrop } from "../plants/components/SeedDrop";
import { SeedPouch } from "../plants/components/SeedPouch";
import { Grabbable } from "../shared/components/Grabbable";
import { ItemUseConstraints } from "../shared/components/ItemUseConstraints";
import { WeightedObject } from "../shared/components/WeightedObject";
import { TerrainGrid } from "../terrain/components/TerrainGrid";
import {
  getTerrainLayer,
  getTopTerrainLayerAtCell,
} from "../terrain/TerrainLayers";
import {
  findPlantAt,
  findPlantByEntity,
  handLabel,
  seedLabel,
} from "./ActionHelpers";

export type TargetActionEntry = {
  id: string;
  label: string;
  detail?: string;
};

export function getTargetActions(
  world: World,
  actor: Entity,
): TargetActionEntry[] {
  const focus = world.getComponent(actor, FocusTarget);

  if (!focus) {
    return [];
  }

  return focus.kind === "object"
    ? getObjectActions(world, actor, focus)
    : getTileActions(world, actor, focus);
}

function getObjectActions(
  world: World,
  actor: Entity,
  focus: FocusTarget,
): TargetActionEntry[] {
  const target = focus.object;

  if (!target) {
    return [];
  }

  const actions: TargetActionEntry[] = [];
  const grownPlant = findPlantByEntity(world, target, true);

  if (grownPlant) {
    actions.push({
      id: "fetch",
      label: "Fetch",
      detail: "Harvest grown plant",
    });
  }

  for (const hand of ["left", "right"] as const) {
    if (canGrabWithHand(world, actor, target, hand)) {
      actions.push({
        id: `${hand}-hand-toggle`,
        label: `${handLabel(hand)} grab`,
        detail: focus.objectLabel,
      });
    }
  }

  if (canNoticeCarryLimit(world, actor, target)) {
    actions.push({
      id: "carry-more-need",
      label: "Stow item",
      detail: "Hands full",
    });
  }

  return actions;
}

function getTileActions(
  world: World,
  actor: Entity,
  focus: FocusTarget,
): TargetActionEntry[] {
  const actions: TargetActionEntry[] = [];
  const grid = world.query(TerrainGrid)[0]?.[1];

  if (!grid) {
    return actions;
  }

  if (findPlantAt(world, focus.tileX, focus.tileY, true)) {
    actions.push({
      id: "fetch",
      label: "Fetch",
      detail: "Harvest grown plant",
    });
  }

  if (canPlantFromPouch(world, actor, focus)) {
    const pouch = world.getComponent(actor, SeedPouch);

    actions.push({
      id: "plant",
      label: "Plant",
      detail: pouch ? seedLabel(pouch.activeSeedId) : undefined,
    });
  }

  actions.push({
    id: "dig",
    label: "Dig",
    detail: getDigDetail(world, focus),
  });

  actions.push({
    id: "forage",
    label: "Forage",
    detail: "Search this ground",
  });

  for (const hand of ["left", "right"] as const) {
    if (canUseHandOnTile(world, actor, focus, hand)) {
      actions.push({
        id: `${hand}-hand-use`,
        label: `${handLabel(hand)} use`,
        detail: "Use held seed",
      });
    }
  }

  return actions;
}

function canGrabWithHand(
  world: World,
  actor: Entity,
  target: Entity,
  hand: HandId,
): boolean {
  const hands = world.getComponent(actor, Hands);
  const slot = hands?.get(hand);
  const weight = world.getComponent(target, WeightedObject);

  return Boolean(
    hands &&
    slot &&
    !slot.held &&
    !world.getComponent(target, HeldItem) &&
    world.getComponent(target, Grabbable) &&
    weight &&
    weight.weight <= hands.maxHandWeight,
  );
}

function canNoticeCarryLimit(
  world: World,
  actor: Entity,
  target: Entity,
): boolean {
  const hands = world.getComponent(actor, Hands);

  return Boolean(
    hands &&
    hands.left.held &&
    hands.right.held &&
    !world.getComponent(target, HeldItem) &&
    world.getComponent(target, Grabbable),
  );
}

function canPlantFromPouch(
  world: World,
  actor: Entity,
  focus: FocusTarget,
): boolean {
  const pouch = world.getComponent(actor, SeedPouch);

  return Boolean(
    pouch &&
    pouch.count(pouch.activeSeedId) > 0 &&
    !findPlantAt(world, focus.tileX, focus.tileY, false),
  );
}

function getDigDetail(world: World, focus: FocusTarget): string {
  const dirtLayer = getTerrainLayer(world, "dirt");

  return dirtLayer?.grid.has(focus.tileX, focus.tileY)
    ? "Break tougher ground"
    : "Loosen soil";
}

function canUseHandOnTile(
  world: World,
  actor: Entity,
  focus: FocusTarget,
  hand: HandId,
): boolean {
  const hands = world.getComponent(actor, Hands);
  const held = hands?.get(hand).held;

  if (!held) {
    return false;
  }

  const seedDrop = world.getComponent(held, SeedDrop);

  if (!seedDrop || seedDrop.collected) {
    return false;
  }

  if (findPlantAt(world, focus.tileX, focus.tileY, false)) {
    return false;
  }

  const constraints = world.getComponent(held, ItemUseConstraints);

  if (!constraints?.requiredTerrainLayerId) {
    return true;
  }

  return (
    getTopTerrainLayerAtCell(world, focus.tileX, focus.tileY)?.layer.id ===
    constraints.requiredTerrainLayerId
  );
}
