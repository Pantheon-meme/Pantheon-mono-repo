import type { System } from "../../../ecs/System";
import type { Entity } from "../../../ecs/World";
import type { World } from "../../../ecs/World";
import { findPlantAt, findPlantByEntity } from "../../actions/ActionHelpers";
import { FocusTarget } from "../../player/components/FocusTarget";
import { PlayerControlled } from "../../player/components/PlayerControlled";
import { PlantCareState } from "../../plants/components/PlantCareState";
import { PlantState } from "../../plants/components/PlantState";
import { plantDefinitions } from "../../plants/PlantDefinitions";
import { getTopTerrainLayerAtCell } from "../../terrain/TerrainLayers";
import { PlantStatusPanel } from "../components/PlantStatusPanel";

export class PlantStatusPanelSystem implements System {
  update(world: World): void {
    const panel = world.query(PlantStatusPanel)[0]?.[1];
    const playerFocus = world.query(PlayerControlled, FocusTarget)[0];

    if (!panel || !playerFocus) {
      return;
    }

    const [, , focus] = playerFocus;
    const plant = getFocusedPlant(world, focus);

    this.positionPanel(panel);

    if (!plant) {
      this.setVisible(panel, false);
      return;
    }

    const care = world.getComponent(plant.entity, PlantCareState);
    const signature = this.getSignature(world, plant.plant, care);

    if (signature !== panel.signature) {
      panel.signature = signature;
      const definition = plantDefinitions[plant.plant.plantId];

      panel.title.setText(definition?.label ?? plant.plant.plantId);
      panel.body.setText(this.getBody(world, plant.plant, care));
    }

    this.setVisible(panel, true);
  }

  private getSignature(
    world: World,
    plant: PlantState,
    care: PlantCareState | undefined,
  ): string {
    return [
      plant.plantId,
      plant.stage,
      Math.floor(plant.elapsedSeconds),
      care?.moisture ?? "",
      care?.fertility ?? "",
      care?.exhaustion ?? "",
      care?.health ?? "",
      care?.stress ?? "",
      care?.syncState ?? "",
      care?.lastAction ?? "",
      getTopTerrainLayerAtCell(world, plant.tileX, plant.tileY)?.layer.id ?? "",
    ].join(":");
  }

  private getBody(
    world: World,
    plant: PlantState,
    care: PlantCareState | undefined,
  ): string {
    const definition = plantDefinitions[plant.plantId];
    const growthSeconds = definition?.growthSeconds ?? 1;
    const growthRatio = Math.max(
      0,
      Math.min(1, plant.elapsedSeconds / growthSeconds),
    );
    const terrainId =
      getTopTerrainLayerAtCell(world, plant.tileX, plant.tileY)?.layer.id ??
      "unknown";
    const ready = plant.stage === "grown";
    const lines = [
      `Stage: ${formatStage(plant.stage)}${ready ? " - ready" : ""}`,
      `Growth: ${Math.round(growthRatio * 100)}%`,
      `Tile: ${plant.tileX},${plant.tileY}`,
      `Terrain: ${formatId(terrainId)}`,
    ];

    if (care) {
      lines.push(
        `Health: ${care.health}/100`,
        `Stress: ${care.stress}/100`,
        `Moisture: ${care.moisture}/100`,
        `Fertility: ${care.fertility}/100`,
        `Exhaustion: ${care.exhaustion}/100`,
        `Yield: ${formatYieldOutlook(care.stress)}`,
        `Care: water moisture, tend fertility/stress`,
        `Sync: ${formatId(care.syncState)}${
          care.lastAction ? ` (${care.lastAction})` : ""
        }`,
      );
    } else {
      lines.push("Care: not tracked locally yet");
    }

    return lines.join("\n");
  }

  private positionPanel(panel: PlantStatusPanel): void {
    const camera = panel.container.scene.cameras.main;
    const scale = 1 / camera.zoom;
    const worldX = camera.worldView.x + panel.screenX * scale;
    const worldY = camera.worldView.y + panel.screenY * scale;

    panel.container.setPosition(worldX, worldY);
    panel.container.setScale(scale);
  }

  private setVisible(panel: PlantStatusPanel, visible: boolean): void {
    panel.container.setVisible(visible);
  }
}

function getFocusedPlant(
  world: World,
  focus: FocusTarget,
): { entity: Entity; plant: PlantState } | undefined {
  if (focus.kind === "object" && focus.object) {
    return findPlantByEntity(world, focus.object, false);
  }

  return findPlantAt(world, focus.tileX, focus.tileY, false);
}

function formatStage(stage: string): string {
  return stage === "fetched" ? "harvested" : formatId(stage);
}

function formatYieldOutlook(stress: number): string {
  if (stress >= 75) {
    return "stressed - reduced";
  }

  if (stress <= 10) {
    return "excellent - bonus";
  }

  return "normal";
}

function formatId(value: string): string {
  return value
    .split(/[-_]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
