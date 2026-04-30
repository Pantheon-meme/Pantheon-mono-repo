import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { ActionLog } from "./components/ActionLog";
import { FocusTarget } from "../player/components/FocusTarget";
import { Footprint } from "../shared/components/Footprint";
import { Grabbable } from "../shared/components/Grabbable";
import { IdeaState } from "../ideas/components/IdeaState";
import { Energy } from "../energy/components/Energy";
import { ForageDrop } from "../items/components/ForageDrop";
import { MudWorld } from "../mud/components/MudWorld";
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
import { getTerrainForageDefinition } from "../forage/ForageLootDefinitions";
import { getItemDefinition, itemLabel } from "../items/ItemDefinitions";
import { getPlantBySeed } from "../plants/PlantDefinitions";
import { getTopTerrainLayerAtCell } from "../terrain/TerrainLayers";
import { clamp, formatLayerName } from "./ActionHelpers";
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
  const mud = world.query(MudWorld)[0]?.[1];

  if (!position || !skills || !grid || !mud) {
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
  const mud = world.query(MudWorld)[0]?.[1];

  if (!position || !skills || !grid || !mud) {
    return { message: "Forage: nowhere to search", applied: false };
  }

  const tileX = focus?.tileX ?? Math.floor(position.x / grid.tileSize);
  const tileY = focus?.tileY ?? Math.floor(position.y / grid.tileSize);
  const activeLayer =
    getTopTerrainLayerAtCell(world, tileX, tileY)?.layer.id ?? "vibrant-grass";
  const terrainBonus =
    activeLayer === "forest-floor" || activeLayer === "swamp"
      ? 3
      : activeLayer === "plain" || activeLayer === "path"
        ? 1
        : 2;
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
  const preview = pickPreviewForage(activeLayer, check.quality);

  if (ideas) {
    ideas.lastCheck = check;
  }
  skills.addExperience("foraging", preview.amount > 0 ? 0.5 : 0.2);

  const pendingDrops =
    preview.amount > 0 && preview.itemId
      ? scatterForageDrops(
          world,
          grid,
          preview.itemId,
          preview.amount,
          tileX,
          tileY,
          true,
        )
      : [];

  const submitted = mud.bridge.submitForage(tileX, tileY, {
    onConfirmed: ({ itemId, amount, playerEnergy }) => {
      clearPendingDrops(world, pendingDrops);

      if (playerEnergy) {
        const energy = world.getComponent(actor, Energy);

        if (energy) {
          energy.max = playerEnergy.maxEnergy;
          energy.current = playerEnergy.energy;
        }
      }

      if (amount <= 0 || !itemId) {
        updateActionLog(world, actor, "Forage: confirmed, found nothing");
        return;
      }

      scatterForageDrops(world, grid, itemId, amount, tileX, tileY, false);
      updateActionLog(
        world,
        actor,
        `Forage: confirmed ${amount} ${itemLabel(itemId)}`,
      );
    },
    onRejected: (message) => {
      clearPendingDrops(world, pendingDrops);
      refundEnergy(world, actor, forageEnergyCost);
      updateActionLog(world, actor, `Forage: ${message}`);
    },
  });

  if (!submitted) {
    clearPendingDrops(world, pendingDrops);

    return { message: "Forage: waiting on MUD sync", applied: false, retry: true };
  }

  return {
    message:
      preview.amount > 0 && preview.itemId
        ? `Forage: maybe ${preview.amount} ${itemLabel(preview.itemId)} (${checkQualityLabel(check.quality)}, syncing)`
        : `Forage: searching ${formatLayerName(activeLayer)} (${checkQualityLabel(check.quality)}, syncing)`,
  };
}

function getForageAmount(quality: CheckQuality, baseChance: number): number {
  const roll = Math.random() * 10000;

  if (quality === "critical-failure" || quality === "failure") {
    return 0;
  }

  if (roll < baseChance) {
    return quality === "critical-success" ? 2 : 1;
  }

  if (roll < baseChance + baseChance / 4) {
    return quality === "critical-success" ? 3 : 2;
  }

  if (
    roll < baseChance + baseChance / 4 + baseChance / 20 &&
    (quality === "great-success" || quality === "critical-success")
  ) {
    return 3;
  }

  return 0;
}

function pickPreviewForage(
  activeLayer: string,
  quality: CheckQuality,
): { itemId: string; amount: number } {
  const definition = getTerrainForageDefinition(activeLayer);

  if (!definition) {
    return { itemId: "", amount: 0 };
  }

  const amount = getForageAmount(quality, definition.baseChance);

  if (amount <= 0) {
    return { itemId: "", amount: 0 };
  }

  const totalWeight = definition.loot.reduce(
    (total, slot) => total + slot.weight,
    0,
  );
  let roll = Math.random() * totalWeight;

  for (const slot of definition.loot) {
    roll -= slot.weight;

    if (roll <= 0) {
      return { itemId: slot.itemId, amount };
    }
  }

  return { itemId: definition.loot[0]?.itemId ?? "", amount };
}

function scatterForageDrops(
  world: World,
  grid: TerrainGrid,
  itemId: string,
  amount: number,
  tileX: number,
  tileY: number,
  pending: boolean,
): Entity[] {
  const drops: Entity[] = [];

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
    addForageDropPayload(world, drop, itemId, pending);
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
      new WeightInspectable(itemLabel(itemId)),
    );
    drops.push(drop);
  }

  return drops;
}

function addForageDropPayload(
  world: World,
  drop: Entity,
  itemId: string,
  pending: boolean,
): void {
  const definition = getItemDefinition(itemId);

  if (definition?.category === "seed" && getPlantBySeed(itemId)) {
    const seedDrop = new SeedDrop(itemId, 1);

    world.addComponent(drop, SeedDrop, seedDrop);
    world.addComponent(drop, ItemUseConstraints, new ItemUseConstraints("dirt"));
    return;
  }

  world.addComponent(drop, ForageDrop, new ForageDrop(itemId, 1, pending));
}

function clearPendingDrops(world: World, drops: Entity[]): void {
  for (const drop of drops) {
    const forageDrop = world.getComponent(drop, ForageDrop);
    const seedDrop = world.getComponent(drop, SeedDrop);
    const position = world.getComponent(drop, Position);

    if (forageDrop) {
      forageDrop.collected = true;
    }

    if (seedDrop) {
      seedDrop.collected = true;
    }

    if (position) {
      position.x = -999999;
      position.y = -999999;
    }
  }
}

function updateActionLog(world: World, actor: Entity, message: string): void {
  const log = world.getComponent(actor, ActionLog);

  if (log) {
    log.lastMessage = message;
  }
}

function refundEnergy(world: World, actor: Entity, amount: number): void {
  const energy = world.getComponent(actor, Energy);

  if (energy) {
    energy.current = Math.min(energy.max, energy.current + amount);
  }
}
