import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { DiggingCapability } from "../player/components/DiggingCapability";
import { FacingDirection } from "../player/components/FacingDirection";
import { FocusTarget } from "../player/components/FocusTarget";
import { NeedState } from "../needs/components/NeedState";
import { Position } from "../shared/components/Position";
import { TerrainDigDepth } from "../terrain/components/TerrainDigDepth";
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

  if (!targetCell || !dirtLayer) {
    return { message: "Dig: no target", applied: false };
  }

  if (!dirtLayer.grid.has(targetCell.x, targetCell.y)) {
    dirtLayer.grid.set(targetCell.x, targetCell.y, true);
    return { message: `Dig: loosened soil at ${targetCell.x},${targetCell.y}` };
  }

  const digDepth = world.query(TerrainDigDepth)[0]?.[1];

  if (!digDepth) {
    return { message: "Dig: no target", applied: false };
  }

  const depth = digDepth.increment(targetCell.x, targetCell.y);

  return {
    message: `Dig: depth ${depth} at ${targetCell.x},${targetCell.y}`,
  };
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
