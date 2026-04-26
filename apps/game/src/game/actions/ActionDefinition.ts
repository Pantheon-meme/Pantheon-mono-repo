import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { Energy } from "../components/Energy";
import { FacingDirection } from "../components/FacingDirection";
import { Position } from "../components/Position";
import { SleepState } from "../components/SleepState";
import { TerrainGrid } from "../components/TerrainGrid";
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
  const dirtLayer = getTerrainLayer(world, "dirt");

  if (!position || !facing || !dirtLayer) {
    return { message: "Dig: no target", applied: false };
  }

  const targetCell = getFacingTargetCell(dirtLayer.grid, position, facing);

  if (dirtLayer.grid.has(targetCell.x, targetCell.y)) {
    return { message: "Dig: already dirt", applied: false };
  }

  dirtLayer.grid.set(targetCell.x, targetCell.y, true);

  return { message: `Dig: loosened soil at ${targetCell.x},${targetCell.y}` };
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

function formatLayerName(layerId: string): string {
  return layerId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
