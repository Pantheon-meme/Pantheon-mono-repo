import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { ActionLog } from "./components/ActionLog";
import { Energy } from "../energy/components/Energy";
import { MudWorld } from "../mud/components/MudWorld";
import { Position } from "../shared/components/Position";
import { SleepState } from "../sleep/components/SleepState";
import { TerrainGrid } from "../terrain/components/TerrainGrid";
import { getTopTerrainLayerAtCell } from "../terrain/TerrainLayers";
import { formatLayerName } from "./ActionHelpers";
import type { ActionDefinition, ActionEffectResult } from "./ActionTypes";

const sleepDurationSeconds = 6;
const defaultSleepTerrainLayerId = "vibrant-grass";
const fallbackSleepEnergyPerSecond = 2;
const sleepEnergyRates: Record<string, number> = {
  "vibrant-grass": 4,
  dirt: 7,
};

export const sleepActionDefinitions: Record<string, ActionDefinition> = {
  sleep: {
    id: "sleep",
    label: "Sleep",
    energyDelta: 0,
    durationSeconds: 0,
    canStart: canSleep,
    apply: sleep,
  },
};

function canSleep(world: World, actor: Entity): ActionEffectResult {
  const position = world.getComponent(actor, Position);
  const sleepState = world.getComponent(actor, SleepState);
  const energy = world.getComponent(actor, Energy);
  const grid = world.query(TerrainGrid)[0]?.[1];
  const mud = world.query(MudWorld)[0]?.[1];

  if (!position || !sleepState || !energy || !grid || !mud) {
    return { message: "Sleep: unavailable", applied: false };
  }

  if (sleepState.active) {
    return { message: "Already sleeping", applied: false };
  }

  if (energy.current >= energy.max) {
    return { message: "Sleep: energy already full", applied: false };
  }

  return {};
}

function sleep(world: World, actor: Entity): ActionEffectResult {
  const startResult = canSleep(world, actor);

  if (startResult.applied === false) {
    return startResult;
  }

  const position = world.getComponent(actor, Position);
  const sleepState = world.getComponent(actor, SleepState);
  const energy = world.getComponent(actor, Energy);
  const grid = world.query(TerrainGrid)[0]?.[1];

  if (!position || !sleepState || !energy || !grid) {
    return { message: "Sleep: unavailable", applied: false };
  }

  const { layerId, energyPerSecond } = getSleepTerrain(world, position, grid);

  sleepState.start(sleepDurationSeconds, energyPerSecond, layerId);

  const mud = world.query(MudWorld)[0]?.[1];
  const submitted = mud?.bridge.submitSleep({
    onConfirmed: ({ readyAt, value, playerEnergy }) => {
      if (playerEnergy) {
        energy.setConfirmed(
          playerEnergy.energy,
          playerEnergy.maxEnergy,
          playerEnergy.updatedAt,
        );
      } else {
        energy.commitLocalDelta(value);
      }

      sleepState.confirmOnchainStart(
        value,
        Math.max(0.1, readyAt - Date.now() / 1000),
      );
      updateActionLog(world, actor, `Sleep: +${value} energy, resting`);
    },
    onRejected: (message) => {
      sleepState.finish();
      updateActionLog(world, actor, `Sleep: ${message}`);
    },
  });

  if (!submitted) {
    sleepState.finish();

    return { message: "Sleep: waiting on MUD sync", applied: false, retry: true };
  }

  return {
    message: `Sleep: ${formatLayerName(layerId)}, +${energyPerSecond}/sec (syncing)`,
  };
}

export function getSleepTerrain(
  world: World,
  position: Position,
  grid: TerrainGrid,
): { layerId: string; energyPerSecond: number } {
  const tileX = Math.floor(position.x / grid.tileSize);
  const tileY = Math.floor(position.y / grid.tileSize);
  const activeLayer =
    getTopTerrainLayerAtCell(world, tileX, tileY)?.layer.id ??
    defaultSleepTerrainLayerId;

  return {
    layerId: activeLayer,
    energyPerSecond:
      sleepEnergyRates[activeLayer] ?? fallbackSleepEnergyPerSecond,
  };
}

function updateActionLog(world: World, actor: Entity, message: string): void {
  const log = world.getComponent(actor, ActionLog);

  if (log) {
    log.lastMessage = message;
  }
}
