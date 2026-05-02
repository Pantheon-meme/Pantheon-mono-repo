import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { ActionLog } from "./components/ActionLog";
import { FocusTarget } from "../player/components/FocusTarget";
import { Footprint } from "../shared/components/Footprint";
import { Grabbable } from "../shared/components/Grabbable";
import { IdeaState } from "../ideas/components/IdeaState";
import { Energy } from "../energy/components/Energy";
import { ForageDrop } from "../items/components/ForageDrop";
import { getMudActionDurationSeconds } from "../mud/ActionDurations";
import { OnchainPresentation } from "../mud/components/OnchainPresentation";
import { MudWorld } from "../mud/components/MudWorld";
import { ItemUseConstraints } from "../shared/components/ItemUseConstraints";
import { Position } from "../shared/components/Position";
import { SeedDrop } from "../plants/components/SeedDrop";
import { SkillSet } from "../ideas/components/SkillSet";
import { OnchainObjectRef } from "../mud/components/OnchainObjectRef";
import type { WorldObjectSnapshot } from "../mud/MudWorldTypes";
import { TerrainGrid } from "../terrain/components/TerrainGrid";
import { WeightInspectable } from "../shared/components/WeightInspectable";
import { WeightedObject } from "../shared/components/WeightedObject";
import { checkQualityLabel, resolveCheck } from "../rules/CheckResolver";
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
    durationSeconds: 0,
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

  if (ideas) {
    ideas.lastCheck = check;
  }
  skills.addExperience("foraging", 0.2);

  const energy = world.getComponent(actor, Energy);
  const optimisticEnergyDelta = -forageEnergyCost;
  const submitted = mud.bridge.submitForage(tileX, tileY, {
    onConfirmed: ({ itemId, amount, playerEnergy, worldObjects }) => {
      if (playerEnergy) {
        energy?.settleOptimisticDelta(
          optimisticEnergyDelta,
          playerEnergy.energy,
          playerEnergy.maxEnergy,
          playerEnergy.updatedAt,
        );
      } else {
        energy?.settleOptimisticLocally(optimisticEnergyDelta);
      }

      if (amount <= 0 || !itemId) {
        updateActionLog(world, actor, "Forage: found nothing");
        return;
      }

      materializeConfirmedForageDrops(
        world,
        grid,
        itemId,
        amount,
        tileX,
        tileY,
        worldObjects,
      );
      skills.addExperience("foraging", 0.3);
      updateActionLog(
        world,
        actor,
        `Forage: found ${amount} ${itemLabel(itemId)} onchain`,
      );
    },
    onRejected: (message) => {
      energy?.rollbackOptimisticDelta(optimisticEnergyDelta);
      clearActionPresentation(world, actor);
      updateActionLog(world, actor, `Forage: ${message}`);
    },
  });

  if (!submitted) {
    return { message: "Forage: waiting on MUD sync", applied: false, retry: true };
  }

  startActionPresentation(world, actor, "forage");

  return {
    message: `Forage: searching ${formatLayerName(activeLayer)} (${checkQualityLabel(check.quality)}, syncing)`,
    energySettlement: "pending",
  };
}

export function scatterForageDrops(
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

function materializeConfirmedForageDrops(
  world: World,
  grid: TerrainGrid,
  itemId: string,
  amount: number,
  tileX: number,
  tileY: number,
  worldObjects: WorldObjectSnapshot[] | undefined,
): void {
  const matchingObjects = (worldObjects ?? [])
    .filter(
      (object) =>
        object.x === tileX &&
        object.y === tileY &&
        object.itemId === itemId &&
        !hasOnchainObject(world, object.objectId),
    )
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, amount)
    .reverse();

  for (const object of matchingObjects) {
    const drops = scatterForageDrops(
      world,
      grid,
      object.itemId,
      object.amount,
      object.x,
      object.y,
      false,
    );

    for (const drop of drops) {
      world.addComponent(
        drop,
        OnchainObjectRef,
        new OnchainObjectRef(object.objectId as `0x${string}`),
      );
    }
  }
}

function hasOnchainObject(world: World, objectId: string): boolean {
  return world
    .query(OnchainObjectRef)
    .some(([, ref]) => ref.objectId === objectId);
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

function updateActionLog(world: World, actor: Entity, message: string): void {
  const log = world.getComponent(actor, ActionLog);

  if (log) {
    log.lastMessage = message;
  }
}

function startActionPresentation(
  world: World,
  actor: Entity,
  action: string,
): void {
  let presentation = world.getComponent(actor, OnchainPresentation);

  if (!presentation) {
    presentation = new OnchainPresentation();
    world.addComponent(actor, OnchainPresentation, presentation);
  }

  presentation.start("action", getMudActionDurationSeconds(action));
}

function clearActionPresentation(world: World, actor: Entity): void {
  const presentation = world.getComponent(actor, OnchainPresentation);

  if (presentation?.pose === "action") {
    presentation.clear();
  }
}
