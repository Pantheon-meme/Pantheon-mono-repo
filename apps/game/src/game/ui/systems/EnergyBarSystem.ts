import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import type { BiomeDefinition } from "../../biome/BiomeDefinitions";
import { BiomeRegionAwareness } from "../../biome/components/BiomeRegionAwareness";
import { Energy } from "../../energy/components/Energy";
import { FocusTarget } from "../../player/components/FocusTarget";
import { PlayerControlled } from "../../player/components/PlayerControlled";
import { getTopTerrainLayerAtCell } from "../../terrain/TerrainLayers";
import { hudColors } from "../HudTheme";
import { EnergyBar } from "../components/EnergyBar";

export class EnergyBarSystem implements System {
  constructor(private readonly biome: BiomeDefinition) {}

  update(world: World): void {
    const playerFocus = world.query(
      PlayerControlled,
      BiomeRegionAwareness,
      FocusTarget,
    )[0];
    const regionAwareness = playerFocus?.[2];
    const focus = playerFocus?.[3];
    const regionLine = this.getRegionLine(world, regionAwareness, focus);

    for (const [, energy, bar] of world.query(Energy, EnergyBar)) {
      const ratio = energy.max === 0 ? 0 : energy.current / energy.max;
      const fillWidth = Math.max(0, bar.width * ratio);
      const camera = bar.container.scene.cameras.main;
      const scale = 1 / camera.zoom;
      const worldX = camera.worldView.x + bar.screenX * scale;
      const worldY = camera.worldView.y + bar.screenY * scale;
      const fillColor = getEnergyFillColor(ratio);

      bar.container.setPosition(worldX, worldY);
      bar.container.setScale(scale);
      bar.fill.width = fillWidth;
      bar.fill.setFillStyle(fillColor, ratio <= 0 ? 0 : 1);
      bar.value.setText(`${Math.round(energy.current)} / ${energy.max}`);
      bar.region.setText(regionLine.trim());
      bar.warning.setVisible(ratio <= 0.25);
      bar.warning.setFillStyle(hudColors.energyLow, ratio <= 0.12 ? 0.22 : 0.1);
      bar.frame.setStrokeStyle(
        2,
        ratio <= 0.25 ? hudColors.energyLow : hudColors.border,
        ratio <= 0.25 ? 0.74 : 0.52,
      );
      bar.container.setVisible(true);
    }
  }

  private getRegionLine(
    world: World,
    regionAwareness: BiomeRegionAwareness | undefined,
    focus: FocusTarget | undefined,
  ): string {
    if (!regionAwareness?.currentRegionLabel) {
      return "";
    }

    const terrainLabel = focus ? this.getTargetTerrainLabel(world, focus) : undefined;

    return terrainLabel
      ? `Region ${regionAwareness.currentRegionLabel} | Target ${terrainLabel}\n`
      : `Region ${regionAwareness.currentRegionLabel}\n`;
  }

  private getTargetTerrainLabel(world: World, focus: FocusTarget): string {
    const terrainId =
      getTopTerrainLayerAtCell(world, focus.tileX, focus.tileY)?.layer.id ??
      this.biome.backgroundTerrainId;
    const terrain = this.biome.terrains.find((entry) => entry.id === terrainId);

    return terrain?.label ?? titleCaseTerrainId(terrainId);
  }
}

function getEnergyFillColor(ratio: number): number {
  if (ratio > 0.55) {
    return hudColors.energy;
  }

  if (ratio > 0.25) {
    return hudColors.energyMedium;
  }

  return hudColors.energyLow;
}

function titleCaseTerrainId(terrainId: string): string {
  return terrainId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
