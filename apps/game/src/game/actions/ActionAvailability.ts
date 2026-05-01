import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { FocusTarget } from "../player/components/FocusTarget";
import { Energy } from "../energy/components/Energy";
import { PlayerInventory } from "../inventory/components/PlayerInventory";
import { SeedPouch } from "../plants/components/SeedPouch";
import { SleepState } from "../sleep/components/SleepState";
import { Position } from "../shared/components/Position";
import { Grabbable } from "../shared/components/Grabbable";
import { WeightedObject } from "../shared/components/WeightedObject";
import { TerrainGrid } from "../terrain/components/TerrainGrid";
import { getTerrainLayer } from "../terrain/TerrainLayers";
import {
  findPlantAt,
  findPlantByEntity,
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

  if (findPlantByEntity(world, target, false)) {
    actions.push({
      id: "water",
      label: "Water",
      detail: "Raise moisture",
    });
    actions.push({
      id: "tend",
      label: "Tend",
      detail: "Improve care",
    });
  }

  if (canGrabIntoInventory(world, actor, target)) {
    actions.push({
      id: "inventory-grab",
      label: "Grab",
      detail: getInventoryGrabDetail(world, actor, target, focus.objectLabel),
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

  const carePlant = findPlantAt(world, focus.tileX, focus.tileY, false);

  if (carePlant) {
    actions.push({
      id: "water",
      label: "Water",
      detail: "Raise moisture",
    });
    actions.push({
      id: "tend",
      label: "Tend",
      detail: "Improve care",
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

  if (canRestoreEnergy(world, actor)) {
    actions.push({
      id: "sleep",
      label: "Sleep",
      detail: "Recover energy",
    });
  }

  return actions;
}

function canRestoreEnergy(world: World, actor: Entity): boolean {
  const energy = world.getComponent(actor, Energy);
  const sleep = world.getComponent(actor, SleepState);
  const position = world.getComponent(actor, Position);
  const grid = world.query(TerrainGrid)[0]?.[1];

  if (
    !energy ||
    energy.current >= energy.max ||
    sleep?.active ||
    !position ||
    !grid
  ) {
    return false;
  }

  return true;
}

function canGrabIntoInventory(
  world: World,
  actor: Entity,
  target: Entity,
): boolean {
  const inventory = world.getComponent(actor, PlayerInventory);
  const weight = world.getComponent(target, WeightedObject);

  return Boolean(
    inventory &&
    world.getComponent(target, Grabbable) &&
    weight &&
    inventory.usedWeight + weight.weight <= inventory.maxWeight &&
    nextFreeInventorySlot(inventory) !== undefined,
  );
}

function getInventoryGrabDetail(
  world: World,
  actor: Entity,
  target: Entity,
  fallbackLabel: string,
): string {
  const inventory = world.getComponent(actor, PlayerInventory);
  const weight = world.getComponent(target, WeightedObject)?.weight ?? 0;

  if (!inventory) {
    return fallbackLabel;
  }

  return `${fallbackLabel} (${formatWeight(
    inventory.usedWeight + weight,
  )}/${formatWeight(inventory.maxWeight)})`;
}

function nextFreeInventorySlot(inventory: PlayerInventory): number | undefined {
  for (let slot = 0; slot < Math.ceil(inventory.maxWeight); slot += 1) {
    if (!inventory.slots.has(slot)) {
      return slot;
    }
  }

  return undefined;
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

function formatWeight(weight: number): string {
  return Number.isInteger(weight) ? `${weight}` : weight.toFixed(2);
}
