import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { PlantState } from "../components/PlantState";
import { plantDefinitions } from "../PlantDefinitions";

export class PlantGrowthSystem implements System {
  update(world: World, deltaSeconds: number): void {
    for (const [, plant] of world.query(PlantState)) {
      if (plant.stage === "grown" || plant.stage === "fetched") {
        continue;
      }

      const definition = plantDefinitions[plant.plantId];

      if (!definition) {
        continue;
      }

      plant.elapsedSeconds += deltaSeconds;

      if (
        plant.elapsedSeconds >=
        definition.growthSeconds * definition.growthThresholds.growing
      ) {
        plant.stage = "grown";
      } else if (
        plant.elapsedSeconds >=
        definition.growthSeconds * definition.growthThresholds.seed
      ) {
        plant.stage = "growing";
      }
    }
  }
}
