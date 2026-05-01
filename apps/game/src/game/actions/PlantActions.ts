import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { ActionLog } from "./components/ActionLog";
import { Energy } from "../energy/components/Energy";
import {
  PlayerInventory,
  type InventoryObjectSlot,
} from "../inventory/components/PlayerInventory";
import { MudWorld } from "../mud/components/MudWorld";
import { FacingDirection } from "../player/components/FacingDirection";
import { FocusTarget } from "../player/components/FocusTarget";
import { Position } from "../shared/components/Position";
import { Footprint } from "../shared/components/Footprint";
import { Grabbable } from "../shared/components/Grabbable";
import { HarvestedPlant } from "../plants/components/HarvestedPlant";
import { HarvestedPlantVisual } from "../plants/components/HarvestedPlantVisual";
import { clampCare, PlantCareState } from "../plants/components/PlantCareState";
import { PlantState } from "../plants/components/PlantState";
import { PlantVisual } from "../plants/components/PlantVisual";
import { SeedPouch } from "../plants/components/SeedPouch";
import { TerrainGrid } from "../terrain/components/TerrainGrid";
import { getTopTerrainLayerAtCell } from "../terrain/TerrainLayers";
import { itemLabel } from "../items/ItemDefinitions";
import { WeightInspectable } from "../shared/components/WeightInspectable";
import { WeightedObject } from "../shared/components/WeightedObject";
import { getPlantBySeed, plantDefinitions } from "../plants/PlantDefinitions";
import { getFacingTargetCell } from "../terrain/GridTargeting";
import {
  clamp,
  createPlantEntity,
  findPlantAt,
  findPlantByEntity,
  seedLabel,
} from "./ActionHelpers";
import type { ActionDefinition, ActionEffectResult } from "./ActionTypes";

const plantEnergyCost = 8;
const fetchEnergyCost = 6;
const waterEnergyCost = 4;
const tendEnergyCost = 5;
export const plantActionDefinitions: Record<string, ActionDefinition> = {
  plant: {
    id: "plant",
    label: "Plant",
    energyDelta: -plantEnergyCost,
    durationSeconds: 1.6,
    canStart: canPlantSeed,
    apply: plantSeed,
  },
  fetch: {
    id: "fetch",
    label: "Fetch",
    energyDelta: -fetchEnergyCost,
    durationSeconds: 1.4,
    canStart: canFetchPlant,
    apply: fetchPlant,
  },
  water: {
    id: "water",
    label: "Water",
    energyDelta: -waterEnergyCost,
    durationSeconds: 1.2,
    canStart: canCarePlant,
    apply: waterPlant,
  },
  tend: {
    id: "tend",
    label: "Tend",
    energyDelta: -tendEnergyCost,
    durationSeconds: 1.2,
    canStart: canCarePlant,
    apply: tendPlant,
  },
  "cycle-seed": {
    id: "cycle-seed",
    label: "Cycle seed",
    energyDelta: 0,
    durationSeconds: 0.2,
    canStart: canCycleSeed,
    apply: cycleSeed,
  },
};

function canPlantSeed(world: World, actor: Entity): ActionEffectResult {
  const position = world.getComponent(actor, Position);
  const facing = world.getComponent(actor, FacingDirection);
  const focus = world.getComponent(actor, FocusTarget);
  const grid = world.query(TerrainGrid)[0]?.[1];
  const mud = world.query(MudWorld)[0]?.[1];

  if (!position || !facing || !grid || !mud) {
    return { message: "Plant: no place to plant", applied: false };
  }

  if (focus?.kind === "object") {
    return {
      message: `Plant: ${focus.objectLabel} is in the way`,
      applied: false,
    };
  }

  const seedSource = resolvePlantSeedSource(world, actor);
  const definition = seedSource ? getPlantBySeed(seedSource.seedId) : undefined;

  if (!seedSource || !definition) {
    return { message: "Plant: no selected seeds", applied: false };
  }

  const targetCell = focus
    ? { x: focus.tileX, y: focus.tileY }
    : getFacingTargetCell(grid, position, facing);

  if (findPlantAt(world, targetCell.x, targetCell.y, false)) {
    return { message: "Plant: tile already occupied", applied: false };
  }

  const constraintMessage = validateSeedSourceTerrain(
    world,
    seedSource,
    targetCell,
  );

  if (constraintMessage) {
    return { message: `Plant: ${constraintMessage}`, applied: false };
  }

  return {};
}

function plantSeed(world: World, actor: Entity): ActionEffectResult {
  const startResult = canPlantSeed(world, actor);

  if (startResult.applied === false) {
    return startResult;
  }

  const position = world.getComponent(actor, Position);
  const facing = world.getComponent(actor, FacingDirection);
  const focus = world.getComponent(actor, FocusTarget);
  const grid = world.query(TerrainGrid)[0]?.[1];
  const mud = world.query(MudWorld)[0]?.[1];

  if (!position || !facing || !grid || !mud) {
    return { message: "Plant: no place to plant", applied: false };
  }

  const seedSource = resolvePlantSeedSource(world, actor);
  const definition = seedSource ? getPlantBySeed(seedSource.seedId) : undefined;

  if (!seedSource || !definition) {
    return { message: "Plant: no selected seeds", applied: false };
  }

  const targetCell = focus
    ? { x: focus.tileX, y: focus.tileY }
    : getFacingTargetCell(grid, position, facing);

  const previousInventorySlot =
    seedSource.kind === "inventory" ? { ...seedSource.slot } : undefined;

  if (!consumeSeedSource(world, actor, seedSource)) {
    return { message: "Plant: no selected seeds", applied: false };
  }

  const plantEntity = createPlantEntity(
    world,
    grid.tileSize,
    targetCell.x,
    targetCell.y,
    definition,
  );
  const care = world.getComponent(plantEntity, PlantCareState);

  if (care) {
    care.syncState = "pending";
    care.lastAction = "plant";
  }

  const energy = world.getComponent(actor, Energy);
  const optimisticEnergyDelta = -plantEnergyCost;
  const submitted = mud.bridge.submitPlant(
    targetCell.x,
    targetCell.y,
    definition.id,
    {
      onConfirmed: ({ x, y, playerEnergy, inventory }) => {
        if (playerEnergy) {
          energy?.settleOptimisticDelta(
            optimisticEnergyDelta,
            playerEnergy.energy,
            playerEnergy.maxEnergy,
            playerEnergy.updatedAt,
          );
        } else {
          energy?.settleOptimisticLocally(optimisticEnergyDelta);
        }
        if (care) {
          care.syncState = "confirmed";
        }
        if (inventory) {
          world.getComponent(actor, PlayerInventory)?.replaceSlots(
            inventory.slots.map((slot) => ({
              ...slot,
              label: itemLabel(slot.itemId),
              syncState: "confirmed",
            })),
            inventory.maxWeight,
          );
        }
        updateActionLog(world, actor, `Plant: confirmed at ${x},${y}`);
      },
      onRejected: (message) => {
        removePlantEntity(world, plantEntity);
        restoreSeedSource(world, actor, seedSource, previousInventorySlot);
        energy?.rollbackOptimisticDelta(optimisticEnergyDelta);
        updateActionLog(world, actor, `Plant: ${message}`);
      },
    },
  );

  if (!submitted) {
    removePlantEntity(world, plantEntity);
    restoreSeedSource(world, actor, seedSource, previousInventorySlot);

    return { message: "Plant: waiting on MUD sync", applied: false, retry: true };
  }

  const noun =
    definition.kind === "tree" ? "seed planted" : "seed tucked into soil";

  return {
    message: `Plant: ${definition.label} ${noun} (syncing)`,
    energySettlement: "pending",
  };
}

type PlantSeedSource =
  | { kind: "inventory"; seedId: string; slot: InventoryObjectSlot }
  | { kind: "pouch"; seedId: string; pouch: SeedPouch };

function resolvePlantSeedSource(
  world: World,
  actor: Entity,
): PlantSeedSource | undefined {
  const inventory = world.getComponent(actor, PlayerInventory);
  const activeSlot = inventory?.slots.get(inventory.activeSlot);

  if (
    activeSlot &&
    activeSlot.amount > 0 &&
    getPlantBySeed(activeSlot.itemId)
  ) {
    return { kind: "inventory", seedId: activeSlot.itemId, slot: activeSlot };
  }

  const pouch = world.getComponent(actor, SeedPouch);

  if (pouch && pouch.count(pouch.activeSeedId) > 0) {
    return { kind: "pouch", seedId: pouch.activeSeedId, pouch };
  }

  return undefined;
}

function validateSeedSourceTerrain(
  world: World,
  source: PlantSeedSource,
  targetCell: { x: number; y: number },
): string | undefined {
  if (source.kind !== "inventory") {
    return undefined;
  }

  const activeLayer = getTopTerrainLayerAtCell(world, targetCell.x, targetCell.y)
    ?.layer.id;

  return activeLayer === "dirt" ? undefined : "seed requires dirt tile";
}

function consumeSeedSource(
  world: World,
  actor: Entity,
  source: PlantSeedSource,
): boolean {
  if (source.kind === "pouch") {
    return source.pouch.consume(source.seedId, 1);
  }

  const inventory = world.getComponent(actor, PlayerInventory);
  const current = inventory?.slots.get(source.slot.slot);

  if (
    !inventory ||
    !current ||
    current.itemId !== source.seedId ||
    current.amount <= 0
  ) {
    return false;
  }

  if (current.amount === 1) {
    inventory.slots.delete(current.slot);
    return true;
  }

  const unitWeight = current.weight / current.amount;

  inventory.slots.set(current.slot, {
    ...current,
    amount: current.amount - 1,
    weight: Math.max(0, current.weight - unitWeight),
    syncState: "pending",
  });

  return true;
}

function restoreSeedSource(
  world: World,
  actor: Entity,
  source: PlantSeedSource,
  previousInventorySlot: InventoryObjectSlot | undefined,
): void {
  if (source.kind === "pouch") {
    source.pouch.add(source.seedId, 1);
    return;
  }

  const inventory = world.getComponent(actor, PlayerInventory);

  if (inventory && previousInventorySlot) {
    inventory.slots.set(previousInventorySlot.slot, {
      ...previousInventorySlot,
      syncState: "rejected",
    });
  }
}

function canFetchPlant(world: World, actor: Entity): ActionEffectResult {
  const position = world.getComponent(actor, Position);
  const facing = world.getComponent(actor, FacingDirection);
  const focus = world.getComponent(actor, FocusTarget);
  const grid = world.query(TerrainGrid)[0]?.[1];
  const mud = world.query(MudWorld)[0]?.[1];

  if (!position || !facing || !grid || !mud) {
    return { message: "Fetch: no plant nearby", applied: false };
  }

  const fallbackTargetCell = getFacingTargetCell(grid, position, facing);
  const plant =
    focus?.kind === "object" && focus.object
      ? findPlantByEntity(world, focus.object, true)
      : findPlantAt(
          world,
          focus?.tileX ?? fallbackTargetCell.x,
          focus?.tileY ?? fallbackTargetCell.y,
          true,
        );

  if (!plant) {
    return { message: "Fetch: no grown plant there", applied: false };
  }

  const definition = plantDefinitions[plant.plant.plantId];

  if (!definition) {
    return { message: "Fetch: unknown plant", applied: false };
  }

  return {};
}

function fetchPlant(world: World, actor: Entity): ActionEffectResult {
  const startResult = canFetchPlant(world, actor);

  if (startResult.applied === false) {
    return startResult;
  }

  const position = world.getComponent(actor, Position);
  const facing = world.getComponent(actor, FacingDirection);
  const focus = world.getComponent(actor, FocusTarget);
  const grid = world.query(TerrainGrid)[0]?.[1];
  const mud = world.query(MudWorld)[0]?.[1];

  if (!position || !facing || !grid || !mud) {
    return { message: "Fetch: no plant nearby", applied: false };
  }

  const fallbackTargetCell = getFacingTargetCell(grid, position, facing);
  const plant =
    focus?.kind === "object" && focus.object
      ? findPlantByEntity(world, focus.object, true)
      : findPlantAt(
          world,
          focus?.tileX ?? fallbackTargetCell.x,
          focus?.tileY ?? fallbackTargetCell.y,
          true,
        );

  if (!plant) {
    return { message: "Fetch: no grown plant there", applied: false };
  }

  const definition = plantDefinitions[plant.plant.plantId];

  if (!definition) {
    return { message: "Fetch: unknown plant", applied: false };
  }

  const previousStage = plant.plant.stage;
  const care = world.getComponent(plant.entity, PlantCareState);
  const previousCare = care?.snapshot();

  plant.plant.stage = "fetched";
  if (care) {
    care.syncState = "pending";
    care.lastAction = "harvest";
  }

  const drop = dropHarvestedPlant(
    world,
    grid,
    definition.id,
    definition.harvestLabel,
    definition.harvestWeight,
    plant.plant.tileX,
    plant.plant.tileY,
  );
  const energy = world.getComponent(actor, Energy);
  const optimisticEnergyDelta = -fetchEnergyCost;
  const submitted = mud.bridge.submitHarvest(plant.plant.tileX, plant.plant.tileY, {
    onConfirmed: ({ amount, itemId, rareAmount, rareItemId, playerEnergy }) => {
      if (playerEnergy) {
        energy?.settleOptimisticDelta(
          optimisticEnergyDelta,
          playerEnergy.energy,
          playerEnergy.maxEnergy,
          playerEnergy.updatedAt,
        );
      } else {
        energy?.settleOptimisticLocally(optimisticEnergyDelta);
      }
      const rareText =
        rareAmount > 0 && rareItemId ? ` + ${rareAmount} ${rareItemId}` : "";
      updateActionLog(
        world,
        actor,
        amount > 0 && itemId
          ? `Fetch: confirmed ${amount} ${itemId}${rareText}`
        : "Fetch: confirmed harvest",
      );
      if (care) {
        care.syncState = "confirmed";
      }
    },
    onRejected: (message) => {
      plant.plant.stage = previousStage;
      if (care && previousCare) {
        care.restore(previousCare);
      }
      removeHarvestDrop(world, drop);
      energy?.rollbackOptimisticDelta(optimisticEnergyDelta);
      updateActionLog(world, actor, `Fetch: ${message}`);
    },
  });

  if (!submitted) {
    plant.plant.stage = previousStage;
    if (care && previousCare) {
      care.restore(previousCare);
    }
    removeHarvestDrop(world, drop);

    return { message: "Fetch: waiting on MUD sync", applied: false, retry: true };
  }

  return {
    message: `Fetch: ${definition.harvestLabel} dropped nearby (syncing)`,
    energySettlement: "pending",
  };
}

function canCarePlant(world: World, actor: Entity): ActionEffectResult {
  return findCarePlant(world, actor)
    ? {}
    : { message: "Care: no plant nearby", applied: false };
}

function waterPlant(world: World, actor: Entity): ActionEffectResult {
  return carePlant(world, actor, "water", waterEnergyCost);
}

function tendPlant(world: World, actor: Entity): ActionEffectResult {
  return carePlant(world, actor, "tend", tendEnergyCost);
}

function carePlant(
  world: World,
  actor: Entity,
  action: "water" | "tend",
  energyCost: number,
): ActionEffectResult {
  const plant = findCarePlant(world, actor);
  const mud = world.query(MudWorld)[0]?.[1];

  if (!plant || !mud) {
    return { message: "Care: no plant nearby", applied: false };
  }

  const energy = world.getComponent(actor, Energy);
  const optimisticEnergyDelta = -energyCost;
  const care = world.getComponent(plant.entity, PlantCareState);
  const previousCare = care?.snapshot();

  if (care) {
    applyOptimisticCare(care, action);
  }

  const submit =
    action === "water" ? mud.bridge.submitWater : mud.bridge.submitTend;
  const submitted = submit.call(
    mud.bridge,
    plant.plant.tileX,
    plant.plant.tileY,
    {
      onConfirmed: ({ x, y, playerEnergy }) => {
        if (playerEnergy) {
          energy?.settleOptimisticDelta(
            optimisticEnergyDelta,
            playerEnergy.energy,
            playerEnergy.maxEnergy,
            playerEnergy.updatedAt,
          );
        } else {
          energy?.settleOptimisticLocally(optimisticEnergyDelta);
        }
        if (care) {
          care.syncState = "confirmed";
        }
        updateActionLog(
          world,
          actor,
          `${capitalize(action)}: confirmed at ${x},${y}`,
        );
      },
      onRejected: (message) => {
        if (care && previousCare) {
          care.restore(previousCare);
        }
        energy?.rollbackOptimisticDelta(optimisticEnergyDelta);
        updateActionLog(world, actor, `${capitalize(action)}: ${message}`);
      },
    },
  );

  if (!submitted) {
    if (care && previousCare) {
      care.restore(previousCare);
    }
    return {
      message: `${capitalize(action)}: waiting on MUD sync`,
      applied: false,
      retry: true,
    };
  }

  return {
    message: `${capitalize(action)}: caring for plant (syncing)`,
    energySettlement: "pending",
  };
}

function canCycleSeed(world: World, actor: Entity): ActionEffectResult {
  const pouch = world.getComponent(actor, SeedPouch);

  if (!pouch) {
    return { message: "Seeds: no pouch", applied: false };
  }

  return {};
}

function cycleSeed(world: World, actor: Entity): ActionEffectResult {
  const startResult = canCycleSeed(world, actor);

  if (startResult.applied === false) {
    return startResult;
  }

  const pouch = world.getComponent(actor, SeedPouch);

  if (!pouch) {
    return { message: "Seeds: no pouch", applied: false };
  }

  pouch.cycle();

  return { message: `Selected ${seedLabel(pouch.activeSeedId)}` };
}

function dropHarvestedPlant(
  world: World,
  grid: TerrainGrid,
  plantId: string,
  label: string,
  weight: number,
  tileX: number,
  tileY: number,
): Entity {
  const drop = world.createEntity();
  const angle = Math.random() * Math.PI * 2;
  const distance = grid.tileSize * (0.18 + Math.random() * 0.42);
  const centerX = tileX * grid.tileSize + grid.tileSize / 2;
  const centerY = tileY * grid.tileSize + grid.tileSize / 2;
  const x = clamp(
    centerX + Math.cos(angle) * distance,
    0,
    grid.width * grid.tileSize,
  );
  const y = clamp(
    centerY + Math.sin(angle) * distance,
    0,
    grid.height * grid.tileSize,
  );

  world.addComponent(drop, Position, new Position(x, y));
  world.addComponent(drop, HarvestedPlant, new HarvestedPlant(plantId));
  world.addComponent(drop, Grabbable, new Grabbable());
  world.addComponent(drop, WeightedObject, new WeightedObject(weight));
  world.addComponent(drop, Footprint, new Footprint(70, 70));
  world.addComponent(drop, WeightInspectable, new WeightInspectable(label));

  return drop;
}

function findCarePlant(
  world: World,
  actor: Entity,
): { entity: Entity; plant: PlantState } | undefined {
  const position = world.getComponent(actor, Position);
  const facing = world.getComponent(actor, FacingDirection);
  const focus = world.getComponent(actor, FocusTarget);
  const grid = world.query(TerrainGrid)[0]?.[1];

  if (!position || !facing || !grid) {
    return undefined;
  }

  const fallbackTargetCell = getFacingTargetCell(grid, position, facing);
  const plant =
    focus?.kind === "object" && focus.object
      ? findPlantByEntity(world, focus.object, false)
      : findPlantAt(
          world,
          focus?.tileX ?? fallbackTargetCell.x,
          focus?.tileY ?? fallbackTargetCell.y,
          false,
        );

  return plant?.plant.stage === "fetched" ? undefined : plant;
}

function applyOptimisticCare(
  care: PlantCareState,
  action: "water" | "tend",
): void {
  care.syncState = "pending";
  care.lastAction = action;

  if (action === "water") {
    care.moisture = clampCare(care.moisture + 28);
    care.recalculate();
    return;
  }

  care.fertility = clampCare(care.fertility + 12);
  care.stress = clampCare(care.stress - 24);
  care.health = 100 - care.stress;
}

function removePlantEntity(world: World, entity: Entity): void {
  world.getComponent(entity, PlantVisual)?.container.destroy();
  world.removeComponent(entity, PlantVisual);
  world.removeComponent(entity, PlantCareState);
  world.removeComponent(entity, PlantState);
  world.removeComponent(entity, Position);
  world.removeComponent(entity, Footprint);
  world.removeComponent(entity, WeightedObject);
  world.removeComponent(entity, WeightInspectable);
}

function removeHarvestDrop(world: World, entity: Entity): void {
  world.getComponent(entity, HarvestedPlantVisual)?.container.destroy();
  world.removeComponent(entity, HarvestedPlantVisual);
  world.removeComponent(entity, HarvestedPlant);
  world.removeComponent(entity, Position);
  world.removeComponent(entity, Grabbable);
  world.removeComponent(entity, WeightedObject);
  world.removeComponent(entity, Footprint);
  world.removeComponent(entity, WeightInspectable);
}

function updateActionLog(world: World, actor: Entity, message: string): void {
  const log = world.getComponent(actor, ActionLog);

  if (log) {
    log.lastMessage = message;
  }
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
