import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { Energy } from "../energy/components/Energy";
import { IdeaState } from "../ideas/components/IdeaState";
import { KnowledgeState } from "../ideas/components/KnowledgeState";
import { NeedState } from "../needs/components/NeedState";
import { Position } from "../shared/components/Position";
import { SkillSet } from "../ideas/components/SkillSet";
import { TerrainGrid } from "../terrain/components/TerrainGrid";
import { getIdeasForNeed } from "../ideas/IdeaDefinitions";
import {
  checkQualityLabel,
  type CheckQuality,
  resolveCheck,
} from "../rules/CheckResolver";
import { getTopTerrainLayerAtCell } from "../terrain/TerrainLayers";
import { formatLayerName } from "./ActionHelpers";
import type { ActionDefinition, ActionEffectResult } from "./ActionTypes";

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

export const reflectionActionDefinitions: Record<string, ActionDefinition> = {
  inspect: {
    id: "inspect",
    label: "Inspect",
    energyDelta: 0,
    durationSeconds: 0.8,
  },
  reflect: {
    id: "reflect",
    label: "Reflect",
    energyDelta: -reflectionEnergyCost,
    durationSeconds: 3.2,
    canStart: canReflect,
    apply: reflect,
  },
};

function canReflect(world: World, actor: Entity): ActionEffectResult {
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
    const progress = ideas.ideas.get(candidate.id);

    return (
      !progress?.unlocked && knowledge.knowsAll(candidate.requiredKnownItems)
    );
  });

  if (!idea) {
    return { message: "Reflect: no reachable idea yet", applied: false };
  }

  return {};
}

function reflect(world: World, actor: Entity): ActionEffectResult {
  const startResult = canReflect(world, actor);

  if (startResult.applied === false) {
    return startResult;
  }

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
