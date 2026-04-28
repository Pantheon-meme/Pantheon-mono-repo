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
const sleepEnergyRates: Record<string, number> = {
  "vibrant-grass": 4,
  dirt: 7,
};
const sleepTerrainLayerIds = new Set(Object.keys(sleepEnergyRates));

export const sleepActionDefinitions: Record<string, ActionDefinition> = {
  sleep: {
    id: "sleep",
    label: "Sleep",
    energyDelta: 0,
    durationSeconds: 1.2,
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

  const terrainLayerId = getSleepTerrainLayerId(world, position, grid);

  if (!terrainLayerId) {
    return { message: "Sleep: needs grass or dirt", applied: false };
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

  const activeLayer = getSleepTerrainLayerId(world, position, grid);

  if (!activeLayer) {
    return { message: "Sleep: needs grass or dirt", applied: false };
  }

  const energyPerSecond = sleepEnergyRates[activeLayer];

  sleepState.start(sleepDurationSeconds, energyPerSecond, activeLayer);

  const mud = world.query(MudWorld)[0]?.[1];
  const submitted = mud?.bridge.submitSleep({
    onConfirmed: () => {
      updateActionLog(world, actor, "Sleep: started onchain");
    },
    onRejected: (message) => {
      sleepState.finish();
      updateActionLog(world, actor, `Sleep: ${message}`);
    },
  });

  if (!submitted) {
    sleepState.finish();

    return { message: "Sleep: waiting on MUD sync", applied: false };
  }

  return {
    message: `Sleep: ${formatLayerName(activeLayer)}, +${energyPerSecond}/sec (syncing)`,
  };
}

function getSleepTerrainLayerId(
  world: World,
  position: Position,
  grid: TerrainGrid,
): string | undefined {
  const tileX = Math.floor(position.x / grid.tileSize);
  const tileY = Math.floor(position.y / grid.tileSize);
  const activeLayer =
    getTopTerrainLayerAtCell(world, tileX, tileY)?.layer.id ??
    defaultSleepTerrainLayerId;

  return sleepTerrainLayerIds.has(activeLayer) ? activeLayer : undefined;
}

export function submitSleepEnergy(
  world: World,
  actor: Entity,
  amount: number,
): ActionEffectResult {
  const energy = world.getComponent(actor, Energy);
  const mud = world.query(MudWorld)[0]?.[1];

  if (!energy || !mud) {
    return { message: "Sleep: MUD world unavailable", applied: false };
  }

  const gain = Math.floor(
    Math.min(amount, Math.max(0, energy.max - energy.current)),
  );

  if (gain <= 0) {
    return { message: "Sleep: energy already full", applied: false };
  }

  const previousEnergy = energy.current;
  energy.current = Math.min(energy.max, energy.current + gain);

  const submitted = mud.bridge.submitResolveAction(gain, {
    onConfirmed: ({ amount: confirmedAmount, playerEnergy }) => {
      if (playerEnergy) {
        energy.max = playerEnergy.maxEnergy;
        energy.current = playerEnergy.energy;
      }

      updateActionLog(
        world,
        actor,
        `Sleep: confirmed +${confirmedAmount} energy`,
      );
    },
    onRejected: (message) => {
      energy.current = previousEnergy;
      updateActionLog(world, actor, `Sleep: ${message}`);
    },
  });

  if (!submitted) {
    energy.current = previousEnergy;

    return { message: "Sleep: waiting on energy sync", applied: false };
  }

  return { message: `Sleep: +${gain} energy (syncing)` };
}

function updateActionLog(world: World, actor: Entity, message: string): void {
  const log = world.getComponent(actor, ActionLog);

  if (log) {
    log.lastMessage = message;
  }
}
