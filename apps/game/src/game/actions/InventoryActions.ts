import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { ForageDrop } from "../items/components/ForageDrop";
import { ForageDropVisual } from "../items/components/ForageDropVisual";
import { PlayerInventory } from "../inventory/components/PlayerInventory";
import { MudWorld } from "../mud/components/MudWorld";
import { OnchainObjectRef } from "../mud/components/OnchainObjectRef";
import { FocusTarget } from "../player/components/FocusTarget";
import { HarvestedPlant } from "../plants/components/HarvestedPlant";
import { HarvestedPlantVisual } from "../plants/components/HarvestedPlantVisual";
import { SeedDrop } from "../plants/components/SeedDrop";
import { SeedDropVisual } from "../plants/components/SeedDropVisual";
import { Position } from "../shared/components/Position";
import { Grabbable } from "../shared/components/Grabbable";
import { WeightInspectable } from "../shared/components/WeightInspectable";
import { WeightedObject } from "../shared/components/WeightedObject";
import type { ActionDefinition, ActionEffectResult } from "./ActionTypes";

export const inventoryActionDefinitions: Record<string, ActionDefinition> = {
  "inventory-grab": {
    id: "inventory-grab",
    label: "Grab",
    energyDelta: 0,
    durationSeconds: 0.2,
    canStart: canGrabIntoInventory,
    apply: grabIntoInventory,
  },
};

export function canGrabIntoInventory(
  world: World,
  actor: Entity,
): ActionEffectResult {
  const target = getFocusedGrabbable(world, actor);

  if (!target) {
    return { message: "Grab: no grabbable object focused", applied: false };
  }

  const inventory = getInventory(world, actor);
  const nextWeight = inventory.usedWeight + target.weight.weight;

  if (nextWeight > inventory.maxWeight) {
    return {
      message: `Grab: inventory too heavy (${formatWeight(nextWeight)}/${formatWeight(
        inventory.maxWeight,
      )})`,
      applied: false,
    };
  }

  if (inventory.nextFreeSlot() === undefined) {
    return { message: "Grab: inventory slots exhausted", applied: false };
  }

  return {};
}

function grabIntoInventory(
  world: World,
  actor: Entity,
): ActionEffectResult {
  const startResult = canGrabIntoInventory(world, actor);

  if (startResult.applied === false) {
    return startResult;
  }

  const target = getFocusedGrabbable(world, actor);
  const inventory = getInventory(world, actor);
  const slot = inventory.nextFreeSlot();

  if (!target || slot === undefined) {
    return { message: "Grab: no grabbable object focused", applied: false };
  }

  inventory.slots.set(slot, {
    slot,
    objectId:
      world.getComponent(target.entity, OnchainObjectRef)?.objectId ??
      `local-${target.entity}`,
    objectTypeId: resolveObjectTypeId(world, target.entity),
    itemId: resolveItemId(world, target.entity),
    amount: resolveAmount(world, target.entity),
    weight: target.weight.weight,
    label: target.label,
  });

  const forageDrop = world.getComponent(target.entity, ForageDrop);
  const seedDrop = world.getComponent(target.entity, SeedDrop);
  const position = world.getComponent(target.entity, Position);
  const previousPosition = position
    ? { x: position.x, y: position.y }
    : undefined;

  if (forageDrop) {
    forageDrop.collected = true;
  }

  if (seedDrop) {
    seedDrop.collected = true;
  }

  hideGrabbedVisual(world, target.entity);
  world.removeComponent(target.entity, Position);
  submitOnchainPickup(
    world,
    actor,
    target.entity,
    slot,
    previousPosition,
    target.label,
  );

  return { message: `Grabbed ${target.label}` };
}

function getFocusedGrabbable(
  world: World,
  actor: Entity,
):
  | {
      entity: Entity;
      label: string;
      weight: WeightedObject;
    }
  | undefined {
  const focus = world.getComponent(actor, FocusTarget);

  if (!focus || focus.kind !== "object" || !focus.object) {
    return undefined;
  }

  const weight = world.getComponent(focus.object, WeightedObject);

  if (!weight || !world.getComponent(focus.object, Grabbable)) {
    return undefined;
  }

  return {
    entity: focus.object,
    label:
      world.getComponent(focus.object, WeightInspectable)?.label ??
      (focus.objectLabel || "object"),
    weight,
  };
}

function getInventory(world: World, actor: Entity): PlayerInventory {
  let inventory = world.getComponent(actor, PlayerInventory);

  if (!inventory) {
    inventory = new PlayerInventory(2);
    world.addComponent(actor, PlayerInventory, inventory);
  }

  return inventory;
}

function resolveObjectTypeId(world: World, entity: Entity): string {
  const seedDrop = world.getComponent(entity, SeedDrop);
  const forageDrop = world.getComponent(entity, ForageDrop);
  const harvest = world.getComponent(entity, HarvestedPlant);

  if (seedDrop) {
    return "seed";
  }

  if (forageDrop) {
    return "forage-drop";
  }

  if (harvest) {
    return "harvest";
  }

  return "object";
}

function resolveItemId(world: World, entity: Entity): string {
  const seedDrop = world.getComponent(entity, SeedDrop);
  const forageDrop = world.getComponent(entity, ForageDrop);
  const harvest = world.getComponent(entity, HarvestedPlant);

  if (seedDrop) {
    return seedDrop.seedId;
  }

  if (forageDrop) {
    return forageDrop.itemId;
  }

  if (harvest) {
    return `${harvest.plantId}_harvest`;
  }

  return "object";
}

function resolveAmount(world: World, entity: Entity): number {
  const seedDrop = world.getComponent(entity, SeedDrop);
  const forageDrop = world.getComponent(entity, ForageDrop);

  return seedDrop?.amount ?? forageDrop?.amount ?? 1;
}

function hideGrabbedVisual(world: World, entity: Entity): void {
  world.getComponent(entity, ForageDropVisual)?.container.setVisible(false);
  world.getComponent(entity, SeedDropVisual)?.container.setVisible(false);
  world.getComponent(entity, HarvestedPlantVisual)?.container.setVisible(false);
}

function submitOnchainPickup(
  world: World,
  actor: Entity,
  entity: Entity,
  slot: number,
  previousPosition: { x: number; y: number } | undefined,
  label: string,
): void {
  const mud = world.query(MudWorld)[0]?.[1];
  const objectRef = world.getComponent(entity, OnchainObjectRef);

  if (!mud || !objectRef) {
    return;
  }

  const accepted = mud.bridge.submitPickupObject(objectRef.objectId, {
    onConfirmed: (pickup) => {
      const inventory = world.getComponent(actor, PlayerInventory);

      if (inventory && pickup.inventory) {
        inventory.replaceSlots(
          pickup.inventory.slots.map((inventorySlot) => ({
            ...inventorySlot,
            syncState: "confirmed",
          })),
          pickup.inventory.maxWeight,
        );
      }
    },
    onRejected: (message) => {
      const inventory = world.getComponent(actor, PlayerInventory);

      inventory?.slots.delete(slot);

      if (previousPosition) {
        world.addComponent(
          entity,
          Position,
          new Position(previousPosition.x, previousPosition.y),
        );
      }

      const forageDrop = world.getComponent(entity, ForageDrop);
      const seedDrop = world.getComponent(entity, SeedDrop);

      if (forageDrop) {
        forageDrop.collected = false;
      }

      if (seedDrop) {
        seedDrop.collected = false;
      }

      showGrabbedVisual(world, entity);
      console.warn(`Pickup rejected for ${label}: ${message}`);
    },
  });

  if (!accepted) {
    console.warn(`Pickup already pending for ${label}`);
  }
}

function showGrabbedVisual(world: World, entity: Entity): void {
  world.getComponent(entity, ForageDropVisual)?.container.setVisible(true);
  world.getComponent(entity, SeedDropVisual)?.container.setVisible(true);
  world.getComponent(entity, HarvestedPlantVisual)?.container.setVisible(true);
}

function formatWeight(weight: number): string {
  return Number.isInteger(weight) ? `${weight}` : weight.toFixed(2);
}
