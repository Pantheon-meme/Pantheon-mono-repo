import type { World } from "../../ecs/World";
import { createPlantEntity, findPlantAt } from "../actions/ActionHelpers";
import { scatterForageDrops } from "../actions/ForageActions";
import { ForageDrop } from "../items/components/ForageDrop";
import { SeedDrop } from "../plants/components/SeedDrop";
import { PlantCareState } from "../plants/components/PlantCareState";
import { PlantState, type PlantStage } from "../plants/components/PlantState";
import { plantDefinitions } from "../plants/PlantDefinitions";
import { Position } from "../shared/components/Position";
import { TerrainDigDepth } from "../terrain/components/TerrainDigDepth";
import { TerrainGrid } from "../terrain/components/TerrainGrid";
import { getTerrainLayer } from "../terrain/TerrainLayers";
import { OnchainObjectRef } from "./components/OnchainObjectRef";
import type { PlantStateSnapshot, PlayerSnapshot } from "./MudWorldTypes";

export class OnchainWorldHydrator {
  private readonly hydratedObjectIds = new Set<string>();

  apply(world: World, grid: TerrainGrid, snapshot: PlayerSnapshot): void {
    this.hydrateWorldObjects(world, grid, snapshot);
    this.hydrateWorldState(world, grid, snapshot);
  }

  private hydrateWorldObjects(
    world: World,
    grid: TerrainGrid,
    snapshot: PlayerSnapshot,
  ): void {
    for (const object of snapshot.worldObjects) {
      if (this.hydratedObjectIds.has(object.objectId)) {
        continue;
      }

      const existingEntity = this.findExistingObject(world, object.objectId);

      if (existingEntity !== undefined) {
        this.hydratedObjectIds.add(object.objectId);
        this.restoreExistingObject(
          world,
          grid,
          existingEntity,
          object.x,
          object.y,
        );
        continue;
      }

      this.hydratedObjectIds.add(object.objectId);
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

  private findExistingObject(
    world: World,
    objectId: string,
  ): number | undefined {
    return world
      .query(OnchainObjectRef)
      .find(([, ref]) => ref.objectId === objectId)?.[0];
  }

  private restoreExistingObject(
    world: World,
    grid: TerrainGrid,
    entity: number,
    tileX: number,
    tileY: number,
  ): void {
    world.addComponent(
      entity,
      Position,
      new Position(
        tileX * grid.tileSize + grid.tileSize / 2,
        tileY * grid.tileSize + grid.tileSize / 2,
      ),
    );

    const forageDrop = world.getComponent(entity, ForageDrop);

    if (forageDrop) {
      forageDrop.collected = false;
      forageDrop.pending = false;
    }

    const seedDrop = world.getComponent(entity, SeedDrop);

    if (seedDrop) {
      seedDrop.collected = false;
    }
  }

  private hydrateWorldState(
    world: World,
    grid: TerrainGrid,
    snapshot: PlayerSnapshot,
  ): void {
    if (!snapshot.worldState) {
      return;
    }

    const dirtLayer = getTerrainLayer(world, "dirt");
    const digDepth = world.query(TerrainDigDepth)[0]?.[1];

    if (dirtLayer && digDepth) {
      for (const terrain of snapshot.worldState.terrain) {
        if (terrain.material !== "dirt" || terrain.digDepth <= 0) {
          continue;
        }

        dirtLayer.grid.set(terrain.x, terrain.y, true);
        digDepth.set(terrain.x, terrain.y, terrain.digDepth);
      }
    }

    for (const plant of snapshot.worldState.plants) {
      this.hydratePlant(world, grid, plant);
    }
  }

  private hydratePlant(
    world: World,
    grid: TerrainGrid,
    snapshot: PlantStateSnapshot,
  ): void {
    const definition = plantDefinitions[snapshot.plantId];

    if (!definition) {
      return;
    }

    const existing = findPlantAt(world, snapshot.x, snapshot.y, false);
    const entity =
      existing?.entity ??
      createPlantEntity(
        world,
        grid.tileSize,
        snapshot.x,
        snapshot.y,
        definition,
      );
    const plant = world.getComponent(entity, PlantState);
    const care = world.getComponent(entity, PlantCareState);

    if (!plant) {
      return;
    }

    plant.elapsedSeconds = Math.max(0, Date.now() / 1000 - snapshot.plantedAt);
    plant.stage = resolvePlantStage(snapshot, definition.growthSeconds);

    if (care) {
      care.health = snapshot.health;
      care.stress = snapshot.stress;
      care.syncState = "confirmed";
    }
  }
}

function resolvePlantStage(
  snapshot: PlantStateSnapshot,
  growthSeconds: number,
): PlantStage {
  if (snapshot.stage === 2) {
    return "fetched";
  }

  const elapsedSeconds = Math.max(0, Date.now() / 1000 - snapshot.plantedAt);

  return elapsedSeconds >= growthSeconds ? "grown" : "growing";
}
