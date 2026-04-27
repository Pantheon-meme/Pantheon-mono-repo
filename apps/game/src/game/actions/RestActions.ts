import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { Energy } from "../energy/components/Energy";
import { Position } from "../shared/components/Position";
import { SleepState } from "../sleep/components/SleepState";
import { TerrainGrid } from "../terrain/components/TerrainGrid";
import { getTopTerrainLayerAtCell } from "../terrain/TerrainLayers";
import { formatLayerName } from "./ActionHelpers";
import type { ActionDefinition, ActionEffectResult } from "./ActionTypes";

const sleepDurationSeconds = 6;
const defaultSleepTerrainLayerId = "vibrant-grass";
const sleepEnergyRates: Record<string, number> = {
  "vibrant-grass": 4,
  dirt: 7,
  bed: 12,
};

export const restActionDefinitions: Record<string, ActionDefinition> = {
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
};

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
