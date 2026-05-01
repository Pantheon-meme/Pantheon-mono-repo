import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import type { Hex } from "viem";
import { ActionLog } from "./components/ActionLog";
import { ForageDrop } from "../items/components/ForageDrop";
import { ForageDropVisual } from "../items/components/ForageDropVisual";
import { getItemDefinition, itemLabel } from "../items/ItemDefinitions";
import {
  PlayerInventory,
  type InventoryObjectSlot,
} from "../inventory/components/PlayerInventory";
import { MudWorld } from "../mud/components/MudWorld";
import { OnchainObjectRef } from "../mud/components/OnchainObjectRef";
import { FacingDirection } from "../player/components/FacingDirection";
import { FocusTarget } from "../player/components/FocusTarget";
import { getPlantBySeed } from "../plants/PlantDefinitions";
import { HarvestedPlant } from "../plants/components/HarvestedPlant";
import { HarvestedPlantVisual } from "../plants/components/HarvestedPlantVisual";
import { SeedDrop } from "../plants/components/SeedDrop";
import { SeedDropVisual } from "../plants/components/SeedDropVisual";
import { Footprint } from "../shared/components/Footprint";
import { ItemUseConstraints } from "../shared/components/ItemUseConstraints";
import { Position } from "../shared/components/Position";
import { Grabbable } from "../shared/components/Grabbable";
import { WeightInspectable } from "../shared/components/WeightInspectable";
import { WeightedObject } from "../shared/components/WeightedObject";
import { getFacingTargetCell } from "../terrain/GridTargeting";
import { TerrainGrid } from "../terrain/components/TerrainGrid";
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
  "inventory-drop": {
    id: "inventory-drop",
    label: "Drop",
    energyDelta: 0,
    durationSeconds: 0.2,
    canStart: canDropFromInventory,
    apply: dropFromInventory,
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

function grabIntoInventory(world: World, actor: Entity): ActionEffectResult {
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

export function canDropFromInventory(
  world: World,
  actor: Entity,
): ActionEffectResult {
  const inventory = getInventory(world, actor);
  const entry = inventory.slots.get(inventory.activeSlot);

  if (!entry) {
    return { message: "Drop: no inventory slot selected", applied: false };
  }

  if (!world.getComponent(actor, Position)) {
    return { message: "Drop: player position unavailable", applied: false };
  }

  if (!world.getComponent(actor, FacingDirection)) {
    return { message: "Drop: facing unavailable", applied: false };
  }

  if (!world.query(TerrainGrid)[0]?.[1]) {
    return { message: "Drop: terrain grid unavailable", applied: false };
  }

  return {};
}

function dropFromInventory(world: World, actor: Entity): ActionEffectResult {
  const startResult = canDropFromInventory(world, actor);

  if (startResult.applied === false) {
    return startResult;
  }

  const inventory = getInventory(world, actor);
  const entry = inventory.slots.get(inventory.activeSlot);
  const position = world.getComponent(actor, Position);
  const facing = world.getComponent(actor, FacingDirection);
  const grid = world.query(TerrainGrid)[0]?.[1];

  if (!entry || !position || !facing || !grid) {
    return { message: "Drop: inventory unavailable", applied: false };
  }

  const target = getFacingTargetCell(grid, position, facing);
  const drop = createInventoryDrop(
    world,
    grid,
    entry,
    target.x,
    target.y,
    true,
  );

  inventory.slots.delete(entry.slot);
  if (!submitOnchainDrop(world, actor, drop, entry, target.x, target.y)) {
    return {
      message: "Drop: waiting on MUD sync",
      applied: false,
      retry: true,
    };
  }

  return {
    message: `Dropped ${entry.label ?? itemLabel(entry.itemId)} (syncing)`,
  };
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

function createInventoryDrop(
  world: World,
  grid: TerrainGrid,
  entry: InventoryObjectSlot,
  tileX: number,
  tileY: number,
  pending: boolean,
): Entity {
  const drop = world.createEntity();
  const x = tileX * grid.tileSize + grid.tileSize / 2;
  const y = tileY * grid.tileSize + grid.tileSize / 2;

  world.addComponent(drop, Position, new Position(x, y));
  addInventoryDropPayload(world, drop, entry.itemId, entry.amount, pending);
  world.addComponent(drop, Grabbable, new Grabbable());
  world.addComponent(drop, WeightedObject, new WeightedObject(entry.weight));
  world.addComponent(drop, Footprint, new Footprint(54, 54));
  world.addComponent(
    drop,
    WeightInspectable,
    new WeightInspectable(entry.label ?? itemLabel(entry.itemId)),
  );

  if (isHexObjectId(entry.objectId)) {
    world.addComponent(
      drop,
      OnchainObjectRef,
      new OnchainObjectRef(entry.objectId as Hex),
    );
  }

  return drop;
}

function addInventoryDropPayload(
  world: World,
  drop: Entity,
  itemId: string,
  amount: number,
  pending: boolean,
): void {
  const definition = getItemDefinition(itemId);

  if (definition?.category === "seed" && getPlantBySeed(itemId)) {
    world.addComponent(drop, SeedDrop, new SeedDrop(itemId, amount));
    world.addComponent(
      drop,
      ItemUseConstraints,
      new ItemUseConstraints("dirt"),
    );
    return;
  }

  world.addComponent(drop, ForageDrop, new ForageDrop(itemId, amount, pending));
}

function submitOnchainDrop(
  world: World,
  actor: Entity,
  drop: Entity,
  entry: InventoryObjectSlot,
  tileX: number,
  tileY: number,
): boolean {
  const mud = world.query(MudWorld)[0]?.[1];

  if (!mud || !isHexObjectId(entry.objectId)) {
    markDropConfirmed(world, drop);
    return true;
  }

  const accepted = mud.bridge.submitDropObject(
    entry.objectId as Hex,
    tileX,
    tileY,
    {
      onConfirmed: (confirmedDrop) => {
        const inventory = world.getComponent(actor, PlayerInventory);

        markDropConfirmed(world, drop);
        updateActionLog(
          world,
          actor,
          `Drop: confirmed ${entry.label ?? itemLabel(entry.itemId)}`,
        );

        if (inventory && confirmedDrop.inventory) {
          inventory.replaceSlots(
            confirmedDrop.inventory.slots.map((inventorySlot) => ({
              ...inventorySlot,
              syncState: "confirmed",
            })),
            confirmedDrop.inventory.maxWeight,
          );
        }
      },
      onRejected: (message) => {
        const inventory = getInventory(world, actor);

        inventory.slots.set(entry.slot, {
          ...entry,
          syncState: "rejected",
        });
        removeInventoryDrop(world, drop);
        updateActionLog(world, actor, `Drop: ${message}`);
        console.warn(
          `Drop rejected for ${entry.label ?? entry.itemId}: ${message}`,
        );
      },
    },
  );

  if (!accepted) {
    const inventory = getInventory(world, actor);

    inventory.slots.set(entry.slot, entry);
    removeInventoryDrop(world, drop);
    console.warn(`Drop already pending for ${entry.label ?? entry.itemId}`);
    return false;
  }

  return true;
}

function markDropConfirmed(world: World, entity: Entity): void {
  const forageDrop = world.getComponent(entity, ForageDrop);

  if (forageDrop) {
    forageDrop.pending = false;
  }
}

function removeInventoryDrop(world: World, entity: Entity): void {
  world.getComponent(entity, ForageDropVisual)?.container.destroy();
  world.getComponent(entity, SeedDropVisual)?.container.destroy();
  world.removeComponent(entity, ForageDropVisual);
  world.removeComponent(entity, SeedDropVisual);
  world.removeComponent(entity, ForageDrop);
  world.removeComponent(entity, SeedDrop);
  world.removeComponent(entity, ItemUseConstraints);
  world.removeComponent(entity, OnchainObjectRef);
  world.removeComponent(entity, Position);
  world.removeComponent(entity, Grabbable);
  world.removeComponent(entity, WeightedObject);
  world.removeComponent(entity, Footprint);
  world.removeComponent(entity, WeightInspectable);
}

function isHexObjectId(objectId: string): objectId is Hex {
  return /^0x[0-9a-fA-F]{64}$/.test(objectId);
}

function updateActionLog(world: World, actor: Entity, message: string): void {
  const log = world.getComponent(actor, ActionLog);

  if (log) {
    log.lastMessage = message;
  }
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
