import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { Energy } from "../components/Energy";
import { FacingDirection } from "../components/FacingDirection";
import { FocusTarget } from "../components/FocusTarget";
import { Footprint } from "../components/Footprint";
import { Hands, type HandId } from "../components/Hands";
import { HeldItem } from "../components/HeldItem";
import { IdeaState } from "../components/IdeaState";
import { KnowledgeState } from "../components/KnowledgeState";
import { NeedState } from "../components/NeedState";
import { PlantState } from "../components/PlantState";
import { Position } from "../components/Position";
import { SeedDrop } from "../components/SeedDrop";
import { SeedPouch } from "../components/SeedPouch";
import { SkillSet } from "../components/SkillSet";
import { SleepState } from "../components/SleepState";
import { TerrainGrid } from "../components/TerrainGrid";
import { WeightInspectable } from "../components/WeightInspectable";
import { WeightedObject } from "../components/WeightedObject";
import { getIdeasForNeed } from "../ideas/IdeaDefinitions";
import { getPlantBySeed, plantDefinitions } from "../plants/PlantDefinitions";
import {
  checkQualityLabel,
  type CheckQuality,
  resolveCheck,
} from "../rules/CheckResolver";
import { getFacingTargetCell } from "../terrain/GridTargeting";
import {
  getTerrainLayer,
  getTopTerrainLayerAtCell,
} from "../terrain/TerrainLayers";

const sleepDurationSeconds = 6;
const defaultSleepTerrainLayerId = "vibrant-grass";
const sleepEnergyRates: Record<string, number> = {
  "vibrant-grass": 4,
  dirt: 7,
  bed: 12,
};
const reflectionEnergyCost = 10;
const defaultReflectionTerrainLayerId = "vibrant-grass";
const reflectionTerrainModifiers: Record<string, number> = {
  "vibrant-grass": 1,
  dirt: 2,
  bed: 3,
};
const reflectionProgressByQuality: Record<CheckQuality, number> = {
  "critical-failure": -2,
  failure: 1,
  partial: 3,
  success: 7,
  "great-success": 11,
  "critical-success": 16,
};
const forageEnergyCost = 10;
const plantEnergyCost = 8;
const fetchEnergyCost = 6;
const seedDropWeight = 0.02;

export type ActionEffectResult = {
  message?: string;
  applied?: boolean;
};

export type ActionDefinition = {
  id: string;
  label: string;
  energyDelta: number;
  apply?: (world: World, actor: Entity) => ActionEffectResult;
};

export const actionDefinitions: Record<string, ActionDefinition> = {
  gather: {
    id: "gather",
    label: "Gather",
    energyDelta: -18,
  },
  forage: {
    id: "forage",
    label: "Forage",
    energyDelta: -forageEnergyCost,
    apply: forage,
  },
  plant: {
    id: "plant",
    label: "Plant",
    energyDelta: -plantEnergyCost,
    apply: plantSeed,
  },
  fetch: {
    id: "fetch",
    label: "Fetch",
    energyDelta: -fetchEnergyCost,
    apply: fetchPlant,
  },
  "cycle-seed": {
    id: "cycle-seed",
    label: "Cycle seed",
    energyDelta: 0,
    apply: cycleSeed,
  },
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
  rest: {
    id: "rest",
    label: "Rest",
    energyDelta: 24,
  },
  sleep: {
    id: "sleep",
    label: "Sleep",
    energyDelta: 0,
    apply: sleep,
  },
  inspect: {
    id: "inspect",
    label: "Inspect",
    energyDelta: 0,
  },
  reflect: {
    id: "reflect",
    label: "Reflect",
    energyDelta: -reflectionEnergyCost,
    apply: reflect,
  },
  dig: {
    id: "dig",
    label: "Dig",
    energyDelta: -12,
    apply: dig,
  },
};

function dig(world: World, actor: Entity): ActionEffectResult {
  const position = world.getComponent(actor, Position);
  const facing = world.getComponent(actor, FacingDirection);
  const focus = world.getComponent(actor, FocusTarget);
  const dirtLayer = getTerrainLayer(world, "dirt");

  if (!position || !facing || !dirtLayer) {
    return { message: "Dig: no target", applied: false };
  }

  if (focus?.kind === "object") {
    return {
      message: `Dig: ${focus.objectLabel} is in focus`,
      applied: false,
    };
  }

  const targetCell = focus
    ? { x: focus.tileX, y: focus.tileY }
    : getFacingTargetCell(dirtLayer.grid, position, facing);

  if (dirtLayer.grid.has(targetCell.x, targetCell.y)) {
    return { message: "Dig: already dirt", applied: false };
  }

  dirtLayer.grid.set(targetCell.x, targetCell.y, true);

  return { message: `Dig: loosened soil at ${targetCell.x},${targetCell.y}` };
}

function forage(world: World, actor: Entity): ActionEffectResult {
  const position = world.getComponent(actor, Position);
  const focus = world.getComponent(actor, FocusTarget);
  const skills = world.getComponent(actor, SkillSet);
  const ideas = world.getComponent(actor, IdeaState);
  const grid = world.query(TerrainGrid)[0]?.[1];

  if (!position || !skills || !grid) {
    return { message: "Forage: nowhere to search", applied: false };
  }

  if (focus?.kind === "object") {
    return {
      message: `Forage: ${focus.objectLabel} is in focus`,
      applied: false,
    };
  }

  const tileX = focus?.tileX ?? Math.floor(position.x / grid.tileSize);
  const tileY = focus?.tileY ?? Math.floor(position.y / grid.tileSize);
  const activeLayer =
    getTopTerrainLayerAtCell(world, tileX, tileY)?.layer.id ?? "vibrant-grass";
  const terrainBonus = activeLayer === "dirt" ? 1 : 2;
  const check = resolveCheck({
    domain: "foraging",
    difficulty: activeLayer === "dirt" ? 9 : 8,
    skill: skills.get("foraging"),
    modifiers: [
      {
        id: `terrain_${activeLayer}`,
        label: `${formatLayerName(activeLayer)} search`,
        value: terrainBonus,
      },
    ],
  });
  const seedId = pickForagedSeed(activeLayer);
  const amount = getForageAmount(check.quality);

  if (ideas) {
    ideas.lastCheck = check;
  }
  skills.addExperience("foraging", amount > 0 ? 0.5 : 0.2);

  if (amount <= 0) {
    return {
      message: `Forage: found nothing (${checkQualityLabel(check.quality)})`,
    };
  }

  scatterSeedDrops(world, grid, seedId, amount, tileX, tileY);

  return {
    message: `Forage: shook loose ${amount} ${seedLabel(seedId)} (${checkQualityLabel(check.quality)})`,
  };
}

function plantSeed(world: World, actor: Entity): ActionEffectResult {
  const pouch = world.getComponent(actor, SeedPouch);
  const position = world.getComponent(actor, Position);
  const facing = world.getComponent(actor, FacingDirection);
  const focus = world.getComponent(actor, FocusTarget);
  const grid = world.query(TerrainGrid)[0]?.[1];

  if (!pouch || !position || !facing || !grid) {
    return { message: "Plant: no place to plant", applied: false };
  }

  if (focus?.kind === "object") {
    return {
      message: `Plant: ${focus.objectLabel} is in the way`,
      applied: false,
    };
  }

  const definition = getPlantBySeed(pouch.activeSeedId);

  if (!definition || pouch.count(pouch.activeSeedId) <= 0) {
    return { message: "Plant: no selected seeds", applied: false };
  }

  const targetCell = focus
    ? { x: focus.tileX, y: focus.tileY }
    : getFacingTargetCell(grid, position, facing);

  if (findPlantAt(world, targetCell.x, targetCell.y, false)) {
    return { message: "Plant: tile already occupied", applied: false };
  }

  if (!pouch.consume(pouch.activeSeedId, 1)) {
    return { message: "Plant: no selected seeds", applied: false };
  }

  const plant = world.createEntity();

  world.addComponent(
    plant,
    Position,
    new Position(
      targetCell.x * grid.tileSize + grid.tileSize / 2,
      targetCell.y * grid.tileSize + grid.tileSize / 2,
    ),
  );
  world.addComponent(
    plant,
    PlantState,
    new PlantState(definition.id, targetCell.x, targetCell.y),
  );
  world.addComponent(plant, Footprint, new Footprint(92, 92));
  world.addComponent(plant, WeightedObject, new WeightedObject(0.08));
  world.addComponent(
    plant,
    WeightInspectable,
    new WeightInspectable(`${definition.label} plant`),
  );

  return { message: `Plant: ${definition.label} seed tucked into soil` };
}

function fetchPlant(world: World, actor: Entity): ActionEffectResult {
  const pouch = world.getComponent(actor, SeedPouch);
  const position = world.getComponent(actor, Position);
  const facing = world.getComponent(actor, FacingDirection);
  const focus = world.getComponent(actor, FocusTarget);
  const grid = world.query(TerrainGrid)[0]?.[1];

  if (!pouch || !position || !facing || !grid) {
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

  plant.plant.stage = "fetched";
  pouch.add(definition.seedId, 2);

  return {
    message: `Fetch: gathered ${definition.label} and recovered 2 ${definition.seedLabel}`,
  };
}

function cycleSeed(world: World, actor: Entity): ActionEffectResult {
  const pouch = world.getComponent(actor, SeedPouch);

  if (!pouch) {
    return { message: "Seeds: no pouch", applied: false };
  }

  pouch.cycle();

  return { message: `Selected ${seedLabel(pouch.activeSeedId)}` };
}

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

  if (!weight) {
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
  const pouch = world.getComponent(actor, SeedPouch);
  const slot = hands?.get(hand);
  const held = slot?.held;

  if (!hands || !slot || !held) {
    return { message: `${handLabel(hand)} hand is empty`, applied: false };
  }

  const seedDrop = world.getComponent(held, SeedDrop);

  if (seedDrop && !seedDrop.collected && pouch) {
    seedDrop.collected = true;
    pouch.add(seedDrop.seedId, seedDrop.amount);
    world.removeComponent(held, HeldItem);
    slot.held = undefined;

    const heldPosition = world.getComponent(held, Position);

    if (heldPosition) {
      heldPosition.x = -999999;
      heldPosition.y = -999999;
    }

    return {
      message: `${handLabel(hand)} hand stored ${seedDrop.amount} ${seedLabel(seedDrop.seedId)}`,
    };
  }

  const label = world.getComponent(held, WeightInspectable)?.label ?? "object";

  return {
    message: `${handLabel(hand)} hand: ${label} has no use yet`,
    applied: false,
  };
}

function sleep(world: World, actor: Entity): ActionEffectResult {
  const position = world.getComponent(actor, Position);
  const sleepState = world.getComponent(actor, SleepState);
  const energy = world.getComponent(actor, Energy);
  const grid = world.query(TerrainGrid)[0]?.[1];

  if (!position || !sleepState || !energy || !grid) {
    return { message: "Sleep: no place to rest", applied: false };
  }

  if (sleepState.active) {
    return { message: "Already sleeping", applied: false };
  }

  if (energy.current >= energy.max) {
    return { message: "Sleep: energy already full", applied: false };
  }

  const tileX = Math.floor(position.x / grid.tileSize);
  const tileY = Math.floor(position.y / grid.tileSize);
  const activeLayer =
    getTopTerrainLayerAtCell(world, tileX, tileY)?.layer.id ??
    defaultSleepTerrainLayerId;
  const energyPerSecond =
    sleepEnergyRates[activeLayer] ??
    sleepEnergyRates[defaultSleepTerrainLayerId];

  sleepState.start(sleepDurationSeconds, energyPerSecond, activeLayer);

  return {
    message: `Sleep: ${formatLayerName(activeLayer)} rest, +${energyPerSecond}/sec`,
  };
}

function reflect(world: World, actor: Entity): ActionEffectResult {
  const energy = world.getComponent(actor, Energy);
  const ideas = world.getComponent(actor, IdeaState);
  const knowledge = world.getComponent(actor, KnowledgeState);
  const needs = world.getComponent(actor, NeedState);
  const position = world.getComponent(actor, Position);
  const skills = world.getComponent(actor, SkillSet);
  const grid = world.query(TerrainGrid)[0]?.[1];

  if (
    !energy ||
    !ideas ||
    !knowledge ||
    !needs ||
    !position ||
    !skills ||
    !grid
  ) {
    return { message: "Reflect: thoughts scatter", applied: false };
  }

  if (energy.current < reflectionEnergyCost) {
    return {
      message: `Reflect needs ${reflectionEnergyCost} energy`,
      applied: false,
    };
  }

  const need = needs.activeNeeds[0];

  if (!need) {
    return { message: "Reflect: no urgent need", applied: false };
  }

  const idea = getIdeasForNeed(need.id).find((candidate) => {
    const progress = ideas.getOrCreate(candidate.id);

    return (
      !progress.unlocked && knowledge.knowsAll(candidate.requiredKnownItems)
    );
  });

  if (!idea) {
    return { message: "Reflect: no reachable idea yet", applied: false };
  }

  const tileX = Math.floor(position.x / grid.tileSize);
  const tileY = Math.floor(position.y / grid.tileSize);
  const activeLayer =
    getTopTerrainLayerAtCell(world, tileX, tileY)?.layer.id ??
    defaultReflectionTerrainLayerId;
  const terrainModifier =
    reflectionTerrainModifiers[activeLayer] ??
    reflectionTerrainModifiers[defaultReflectionTerrainLayerId];
  const urgencyModifier = Math.floor(need.urgency / 25);
  const check = resolveCheck({
    domain: "reflection",
    difficulty: idea.difficulty,
    skill: skills.get(idea.skillId),
    modifiers: [
      {
        id: "need_urgency",
        label: "Need urgency",
        value: urgencyModifier,
      },
      {
        id: `terrain_${activeLayer}`,
        label: `${formatLayerName(activeLayer)} focus`,
        value: terrainModifier,
      },
    ],
  });
  const progress = ideas.getOrCreate(idea.id);
  const progressGain = reflectionProgressByQuality[check.quality];

  progress.progress = Math.max(
    0,
    Math.min(idea.progressRequired, progress.progress + progressGain),
  );
  progress.unlocked = progress.progress >= idea.progressRequired;
  ideas.lastCheck = check;
  skills.addExperience(idea.skillId, check.quality === "failure" ? 0.2 : 0.5);

  if (progress.unlocked) {
    return {
      message: `${idea.label} idea unlocked (${checkQualityLabel(check.quality)})`,
    };
  }

  return {
    message: `${idea.label}: ${Math.floor(progress.progress)}/${idea.progressRequired} insight (${checkQualityLabel(check.quality)})`,
  };
}

function formatLayerName(layerId: string): string {
  return layerId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function findPlantAt(
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

function findPlantByEntity(
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

function pickForagedSeed(activeLayer: string): string {
  const roll = Math.random();

  if (activeLayer === "dirt") {
    return roll < 0.68 ? "moonroot_seed" : "sungrain_seed";
  }

  return roll < 0.72 ? "sungrain_seed" : "moonroot_seed";
}

function getForageAmount(quality: CheckQuality): number {
  if (quality === "critical-failure" || quality === "failure") {
    return 0;
  }

  if (quality === "partial") {
    return 1;
  }

  if (quality === "great-success") {
    return 3;
  }

  if (quality === "critical-success") {
    return 4;
  }

  return 2;
}

function seedLabel(seedId: string): string {
  return (
    Object.values(plantDefinitions).find(
      (definition) => definition.seedId === seedId,
    )?.seedLabel ?? seedId
  );
}

function handLabel(hand: HandId): string {
  return hand === "left" ? "Left" : "Right";
}

function scatterSeedDrops(
  world: World,
  grid: TerrainGrid,
  seedId: string,
  amount: number,
  tileX: number,
  tileY: number,
): void {
  for (let index = 0; index < amount; index += 1) {
    const drop = world.createEntity();
    const angle = Math.random() * Math.PI * 2;
    const distance = grid.tileSize * (0.18 + Math.random() * 0.38);
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
    world.addComponent(drop, SeedDrop, new SeedDrop(seedId, 1));
    world.addComponent(
      drop,
      WeightedObject,
      new WeightedObject(seedDropWeight),
    );
    world.addComponent(drop, Footprint, new Footprint(54, 54));
    world.addComponent(
      drop,
      WeightInspectable,
      new WeightInspectable(seedLabel(seedId)),
    );
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
