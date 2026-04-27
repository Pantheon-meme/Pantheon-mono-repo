import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { FocusTarget } from "../player/components/FocusTarget";
import { Footprint } from "../shared/components/Footprint";
import { Grabbable } from "../shared/components/Grabbable";
import { IdeaState } from "../ideas/components/IdeaState";
import { ItemUseConstraints } from "../shared/components/ItemUseConstraints";
import { Position } from "../shared/components/Position";
import { SeedDrop } from "../plants/components/SeedDrop";
import { SkillSet } from "../ideas/components/SkillSet";
import { TerrainGrid } from "../terrain/components/TerrainGrid";
import { WeightInspectable } from "../shared/components/WeightInspectable";
import { WeightedObject } from "../shared/components/WeightedObject";
import {
  checkQualityLabel,
  type CheckQuality,
  resolveCheck,
} from "../rules/CheckResolver";
import { getTopTerrainLayerAtCell } from "../terrain/TerrainLayers";
import { clamp, formatLayerName, seedLabel } from "./ActionHelpers";
import type { ActionDefinition, ActionEffectResult } from "./ActionTypes";

const forageEnergyCost = 10;
const seedDropWeight = 0.02;

export const forageActionDefinitions: Record<string, ActionDefinition> = {
  gather: {
    id: "gather",
    label: "Gather",
    energyDelta: -18,
    durationSeconds: 1.5,
  },
  forage: {
    id: "forage",
    label: "Forage",
    energyDelta: -forageEnergyCost,
    durationSeconds: 2.4,
    canStart: canForage,
    apply: forage,
  },
};

function canForage(world: World, actor: Entity): ActionEffectResult {
  const position = world.getComponent(actor, Position);
  const focus = world.getComponent(actor, FocusTarget);
  const skills = world.getComponent(actor, SkillSet);
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

  return {};
}

function forage(world: World, actor: Entity): ActionEffectResult {
  const startResult = canForage(world, actor);

  if (startResult.applied === false) {
    return startResult;
  }

  const position = world.getComponent(actor, Position);
  const focus = world.getComponent(actor, FocusTarget);
  const skills = world.getComponent(actor, SkillSet);
  const ideas = world.getComponent(actor, IdeaState);
  const grid = world.query(TerrainGrid)[0]?.[1];

  if (!position || !skills || !grid) {
    return { message: "Forage: nowhere to search", applied: false };
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
      ItemUseConstraints,
      new ItemUseConstraints("dirt"),
    );
    world.addComponent(drop, Grabbable, new Grabbable());
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
