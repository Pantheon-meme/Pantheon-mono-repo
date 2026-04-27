import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { FacingDirection } from "../player/components/FacingDirection";
import { FocusTarget } from "../player/components/FocusTarget";
import { Position } from "../shared/components/Position";
import { getFacingTargetCell } from "../terrain/GridTargeting";
import { getTerrainLayer } from "../terrain/TerrainLayers";
import type { ActionDefinition, ActionEffectResult } from "./ActionTypes";

export const terrainActionDefinitions: Record<string, ActionDefinition> = {
  dig: {
    id: "dig",
    label: "Dig",
    energyDelta: -12,
    durationSeconds: 2,
    canStart: canDig,
    apply: dig,
  },
};

function canDig(world: World, actor: Entity): ActionEffectResult {
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

  return {};
}

function dig(world: World, actor: Entity): ActionEffectResult {
  const startResult = canDig(world, actor);

  if (startResult.applied === false) {
    return startResult;
  }

  const position = world.getComponent(actor, Position);
  const facing = world.getComponent(actor, FacingDirection);
  const focus = world.getComponent(actor, FocusTarget);
  const dirtLayer = getTerrainLayer(world, "dirt");

  if (!position || !facing || !dirtLayer) {
    return { message: "Dig: no target", applied: false };
  }

  const targetCell = focus
    ? { x: focus.tileX, y: focus.tileY }
    : getFacingTargetCell(dirtLayer.grid, position, facing);

  dirtLayer.grid.set(targetCell.x, targetCell.y, true);

  return { message: `Dig: loosened soil at ${targetCell.x},${targetCell.y}` };
}
