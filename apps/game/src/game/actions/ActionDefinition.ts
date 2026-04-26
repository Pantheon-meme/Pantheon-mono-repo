import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { Energy } from "../components/Energy";
import { FacingDirection } from "../components/FacingDirection";
import { IdeaState } from "../components/IdeaState";
import { KnowledgeState } from "../components/KnowledgeState";
import { NeedState } from "../components/NeedState";
import { Position } from "../components/Position";
import { SkillSet } from "../components/SkillSet";
import { SleepState } from "../components/SleepState";
import { TerrainGrid } from "../components/TerrainGrid";
import { getIdeasForNeed } from "../ideas/IdeaDefinitions";
import {
  checkQualityLabel,
  type CheckQuality,
  resolveCheck,
} from "../rules/CheckResolver";
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
const reflectionEnergyCost = 10;
const defaultReflectionTerrainLayerId = "vibrant-grass";
const reflectionTerrainModifiers: Record<string, number> = {
  "vibrant-grass": 1,
  dirt: 2,
  bed: 3,
};
const reflectionProgressByQuality: Record<CheckQuality, number> = {
  "critical-failure": -2,
  failure: 1,
  partial: 3,
  success: 7,
  "great-success": 11,
  "critical-success": 16,
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
  reflect: {
    id: "reflect",
    label: "Reflect",
    energyDelta: -reflectionEnergyCost,
    apply: reflect,
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

function reflect(world: World, actor: Entity): ActionEffectResult {
  const energy = world.getComponent(actor, Energy);
  const ideas = world.getComponent(actor, IdeaState);
  const knowledge = world.getComponent(actor, KnowledgeState);
  const needs = world.getComponent(actor, NeedState);
  const position = world.getComponent(actor, Position);
  const skills = world.getComponent(actor, SkillSet);
  const grid = world.query(TerrainGrid)[0]?.[1];

  if (
    !energy ||
    !ideas ||
    !knowledge ||
    !needs ||
    !position ||
    !skills ||
    !grid
  ) {
    return { message: "Reflect: thoughts scatter", applied: false };
  }

  if (energy.current < reflectionEnergyCost) {
    return {
      message: `Reflect needs ${reflectionEnergyCost} energy`,
      applied: false,
    };
  }

  const need = needs.activeNeeds[0];

  if (!need) {
    return { message: "Reflect: no urgent need", applied: false };
  }

  const idea = getIdeasForNeed(need.id).find((candidate) => {
    const progress = ideas.getOrCreate(candidate.id);

    return (
      !progress.unlocked && knowledge.knowsAll(candidate.requiredKnownItems)
    );
  });

  if (!idea) {
    return { message: "Reflect: no reachable idea yet", applied: false };
  }

  const tileX = Math.floor(position.x / grid.tileSize);
  const tileY = Math.floor(position.y / grid.tileSize);
  const activeLayer =
    getTopTerrainLayerAtCell(world, tileX, tileY)?.layer.id ??
    defaultReflectionTerrainLayerId;
  const terrainModifier =
    reflectionTerrainModifiers[activeLayer] ??
    reflectionTerrainModifiers[defaultReflectionTerrainLayerId];
  const urgencyModifier = Math.floor(need.urgency / 25);
  const check = resolveCheck({
    domain: "reflection",
    difficulty: idea.difficulty,
    skill: skills.get(idea.skillId),
    modifiers: [
      {
        id: "need_urgency",
        label: "Need urgency",
        value: urgencyModifier,
      },
      {
        id: `terrain_${activeLayer}`,
        label: `${formatLayerName(activeLayer)} focus`,
        value: terrainModifier,
      },
    ],
  });
  const progress = ideas.getOrCreate(idea.id);
  const progressGain = reflectionProgressByQuality[check.quality];

  progress.progress = Math.max(
    0,
    Math.min(idea.progressRequired, progress.progress + progressGain),
  );
  progress.unlocked = progress.progress >= idea.progressRequired;
  ideas.lastCheck = check;
  skills.addExperience(idea.skillId, check.quality === "failure" ? 0.2 : 0.5);

  if (progress.unlocked) {
    return {
      message: `${idea.label} idea unlocked (${checkQualityLabel(check.quality)})`,
    };
  }

  return {
    message: `${idea.label}: ${Math.floor(progress.progress)}/${idea.progressRequired} insight (${checkQualityLabel(check.quality)})`,
  };
}

function formatLayerName(layerId: string): string {
  return layerId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
