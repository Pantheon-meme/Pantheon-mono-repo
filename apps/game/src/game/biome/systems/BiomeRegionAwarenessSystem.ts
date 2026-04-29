import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { ActionLog } from "../../actions/components/ActionLog";
import type { BiomeDefinition } from "../BiomeDefinitions";
import {
  createBiomeRegionPlan,
  getDominantRegion,
} from "../BiomeRegionGeneration";
import { FreeExploreMode } from "../../player/components/FreeExploreMode";
import { PlayerControlled } from "../../player/components/PlayerControlled";
import { Position } from "../../shared/components/Position";
import { TerrainGrid } from "../../terrain/components/TerrainGrid";
import { BiomeRegionAwareness } from "../components/BiomeRegionAwareness";

export class BiomeRegionAwarenessSystem implements System {
  private plan?: ReturnType<typeof createBiomeRegionPlan>;
  private gridWidth?: number;
  private gridHeight?: number;

  constructor(private readonly biome: BiomeDefinition) {}

  update(world: World): void {
    const grid = world.query(TerrainGrid)[0]?.[1];

    if (!grid) {
      return;
    }

    this.ensurePlan(grid);

    if (!this.plan) {
      return;
    }

    for (const [entity, position, log] of world.query(
      Position,
      ActionLog,
      PlayerControlled,
      FreeExploreMode,
    )) {
      let awareness = world.getComponent(entity, BiomeRegionAwareness);

      if (!awareness) {
        awareness = new BiomeRegionAwareness();
        world.addComponent(entity, BiomeRegionAwareness, awareness);
      }

      const tileX = Math.floor(position.x / grid.tileSize);
      const tileY = Math.floor(position.y / grid.tileSize);
      const region = getDominantRegion(this.plan, tileX, tileY);

      if (!region) {
        continue;
      }

      if (!awareness.currentRegionId) {
        awareness.currentRegionId = region.definition.id;
        awareness.currentRegionLabel = region.definition.label;
        continue;
      }

      if (awareness.currentRegionId === region.definition.id) {
        awareness.currentRegionLabel = region.definition.label;
        continue;
      }

      awareness.currentRegionId = region.definition.id;
      awareness.currentRegionLabel = region.definition.label;
      log.lastMessage = `Region: entered ${region.definition.label}`;
    }
  }

  private ensurePlan(grid: TerrainGrid): void {
    if (
      this.plan &&
      this.gridWidth === grid.width &&
      this.gridHeight === grid.height
    ) {
      return;
    }

    this.plan = createBiomeRegionPlan(grid, this.biome);
    this.gridWidth = grid.width;
    this.gridHeight = grid.height;
  }
}
