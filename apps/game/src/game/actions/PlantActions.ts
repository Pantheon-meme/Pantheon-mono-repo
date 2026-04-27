import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { FacingDirection } from "../player/components/FacingDirection";
import { FocusTarget } from "../player/components/FocusTarget";
import { Position } from "../shared/components/Position";
import { SeedPouch } from "../plants/components/SeedPouch";
import { TerrainGrid } from "../terrain/components/TerrainGrid";
import { getPlantBySeed, plantDefinitions } from "../plants/PlantDefinitions";
import { getFacingTargetCell } from "../terrain/GridTargeting";
import {
  createPlantEntity,
  findPlantAt,
  findPlantByEntity,
  seedLabel,
} from "./ActionHelpers";
import type { ActionDefinition, ActionEffectResult } from "./ActionTypes";

const plantEnergyCost = 8;
const fetchEnergyCost = 6;

export const plantActionDefinitions: Record<string, ActionDefinition> = {
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
};

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

  createPlantEntity(
    world,
    grid.tileSize,
    targetCell.x,
    targetCell.y,
    definition,
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
