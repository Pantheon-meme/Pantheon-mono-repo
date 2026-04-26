import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { FacingDirection } from "../components/FacingDirection";
import { Position } from "../components/Position";
import { getFacingTargetCell } from "../terrain/GridTargeting";
import { getTerrainLayer } from "../terrain/TerrainLayers";

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
