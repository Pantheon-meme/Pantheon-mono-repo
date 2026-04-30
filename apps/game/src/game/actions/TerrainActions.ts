import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { ActionLog } from "./components/ActionLog";
import { DiggingCapability } from "../player/components/DiggingCapability";
import { Energy } from "../energy/components/Energy";
import { MudWorld } from "../mud/components/MudWorld";
import { FacingDirection } from "../player/components/FacingDirection";
import { FocusTarget } from "../player/components/FocusTarget";
import { NeedState } from "../needs/components/NeedState";
import { Position } from "../shared/components/Position";
import { TerrainDigDepth } from "../terrain/components/TerrainDigDepth";
import type { TerrainGrid } from "../terrain/components/TerrainGrid";
import { TerrainHardness } from "../terrain/components/TerrainHardness";
import { getFacingTargetCell } from "../terrain/GridTargeting";
import {
  getTerrainLayer,
  getTopTerrainLayerAtCell,
} from "../terrain/TerrainLayers";
import type { ActionDefinition, ActionEffectResult } from "./ActionTypes";

const digEnergyCost = 12;

export const terrainActionDefinitions: Record<string, ActionDefinition> = {
  dig: {
    id: "dig",
    label: "Dig",
    energyDelta: -digEnergyCost,
    durationSeconds: 2,
    canStart: canDig,
    apply: dig,
  },
};

function canDig(world: World, actor: Entity): ActionEffectResult {
  const dirtLayer = getTerrainLayer(world, "dirt");
  const targetCell = getDigTargetCell(world, actor);
  const digDepth = world.query(TerrainDigDepth)[0]?.[1];
  const hardness = world.query(TerrainHardness)[0]?.[1];

  if (!targetCell || !dirtLayer || !digDepth || !hardness) {
    return { message: "Dig: no target", applied: false };
  }

  const focus = world.getComponent(actor, FocusTarget);

  if (focus?.kind === "object") {
    return {
      message: `Dig: ${focus.objectLabel} is in focus`,
      applied: false,
    };
  }

  const isSurfaceDirt = dirtLayer.grid.has(targetCell.x, targetCell.y);
  const terrainLayerId =
    getTopTerrainLayerAtCell(world, targetCell.x, targetCell.y)?.layer.id ??
    hardness.defaultLayerId;
  const requiredPower = isSurfaceDirt
    ? hardness.getDeepHardness(digDepth.get(targetCell.x, targetCell.y))
    : hardness.getLayerHardness(terrainLayerId);
  const power = world.getComponent(actor, DiggingCapability)?.power ?? 1;

  if (power < requiredPower) {
    discoverDiggingToolNeed(world, actor, requiredPower);

    return {
      message: `Dig: ${terrainLayerId} needs a digging tool`,
      applied: false,
    };
  }

  return {};
}

function dig(world: World, actor: Entity): ActionEffectResult {
  const startResult = canDig(world, actor);

  if (startResult.applied === false) {
    return startResult;
  }

  const dirtLayer = getTerrainLayer(world, "dirt");
  const targetCell = getDigTargetCell(world, actor);
  const mud = world.query(MudWorld)[0]?.[1];

  if (!targetCell || !dirtLayer || !mud) {
    return { message: "Dig: MUD world unavailable", applied: false };
  }

  const digDepth = world.query(TerrainDigDepth)[0]?.[1];

  if (!digDepth) {
    return { message: "Dig: no target", applied: false };
  }

  const previousState = {
    hadDirt: dirtLayer.grid.has(targetCell.x, targetCell.y),
    depth: digDepth.get(targetCell.x, targetCell.y),
  };
  const optimisticMessage = applyOptimisticDig(
    dirtLayer.grid,
    digDepth,
    targetCell.x,
    targetCell.y,
  );
  const submitted = mud.bridge.submitDig(targetCell.x, targetCell.y, {
    onConfirmed: ({ x, y }) => {
      updateActionLog(world, actor, `Dig: confirmed at ${x},${y}`);
    },
    onRejected: (message) => {
      rollbackOptimisticDig(
        dirtLayer.grid,
        digDepth,
        targetCell.x,
        targetCell.y,
        previousState,
      );
      refundEnergy(world, actor, digEnergyCost);
      updateActionLog(world, actor, `Dig: ${message}`);
    },
  });

  if (!submitted) {
    rollbackOptimisticDig(
      dirtLayer.grid,
      digDepth,
      targetCell.x,
      targetCell.y,
      previousState,
    );

    return {
      message: `Dig: waiting on ${targetCell.x},${targetCell.y}`,
      applied: false,
    };
  }

  return { message: `${optimisticMessage} (syncing)` };
}

function getDigTargetCell(
  world: World,
  actor: Entity,
): { x: number; y: number } | undefined {
  const position = world.getComponent(actor, Position);
  const facing = world.getComponent(actor, FacingDirection);
  const focus = world.getComponent(actor, FocusTarget);
  const dirtLayer = getTerrainLayer(world, "dirt");

  if (!position || !facing || !dirtLayer) {
    return undefined;
  }

  return focus
    ? { x: focus.tileX, y: focus.tileY }
    : getFacingTargetCell(dirtLayer.grid, position, facing);
}

function discoverDiggingToolNeed(
  world: World,
  actor: Entity,
  requiredPower: number,
): void {
  const needs = world.getComponent(actor, NeedState);

  needs?.addNeed({
    id: "digging_tool",
    label: "Find a digging tool",
    description: `Bare hands are not enough here. Something with digging power ${requiredPower} could break tougher ground.`,
    urgency: Math.min(100, 50 + requiredPower * 8),
    active: true,
  });
}

function updateActionLog(world: World, actor: Entity, message: string): void {
  const log = world.getComponent(actor, ActionLog);

  if (log) {
    log.lastMessage = message;
  }
}

function applyOptimisticDig(
  dirtGrid: Pick<TerrainGrid, "has" | "set">,
  digDepth: TerrainDigDepth,
  x: number,
  y: number,
): string {
  if (!dirtGrid.has(x, y)) {
    dirtGrid.set(x, y, true);
    return `Dig: loosened soil at ${x},${y}`;
  }

  const depth = digDepth.increment(x, y);

  return `Dig: depth ${depth} at ${x},${y}`;
}

function rollbackOptimisticDig(
  dirtGrid: Pick<TerrainGrid, "set">,
  digDepth: TerrainDigDepth,
  x: number,
  y: number,
  previousState: { hadDirt: boolean; depth: number },
): void {
  dirtGrid.set(x, y, previousState.hadDirt);
  digDepth.set(x, y, previousState.depth);
}

function refundEnergy(world: World, actor: Entity, amount: number): void {
  const energy = world.getComponent(actor, Energy);

  if (!energy) {
    return;
  }

  energy.current = Math.min(energy.max, energy.current + amount);
}
