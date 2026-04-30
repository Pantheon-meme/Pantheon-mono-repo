import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { ActionLog } from "../../actions/components/ActionLog";
import type { BiomeDefinition } from "../../biome/BiomeDefinitions";
import { BiomeRegionAwareness } from "../../biome/components/BiomeRegionAwareness";
import { Energy } from "../../energy/components/Energy";
import { FocusTarget } from "../../player/components/FocusTarget";
import { PlayerControlled } from "../../player/components/PlayerControlled";
import { getTopTerrainLayerAtCell } from "../../terrain/TerrainLayers";
import { EnergyBar } from "../components/EnergyBar";

export class EnergyBarSystem implements System {
  constructor(private readonly biome: BiomeDefinition) {}

  update(world: World): void {
    const actionLog = world.query(ActionLog)[0]?.[1];
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
      const camera = bar.background.scene.cameras.main;
      const scale = 1 / camera.zoom;
      const worldX = camera.worldView.x + bar.screenX * scale;
      const worldY = camera.worldView.y + bar.screenY * scale;

      bar.background.setPosition(worldX, worldY);
      bar.background.setScale(scale);
      bar.fill.setPosition(worldX, worldY);
      bar.fill.setScale(scale);
      bar.label.setPosition(worldX, worldY + (bar.height + 6) * scale);
      bar.label.setScale(scale);
      bar.fill.width = fillWidth;
      bar.label.setText(
        `${regionLine}Energy ${Math.round(energy.current)} / ${energy.max}\n${actionLog?.lastMessage ?? ""}`,
      );

      if (ratio > 0.55) {
        bar.fill.setFillStyle(0x66d685);
      } else if (ratio > 0.25) {
        bar.fill.setFillStyle(0xf0c85a);
      } else {
        bar.fill.setFillStyle(0xee6b5f);
      }

      bar.background.setVisible(true);
      bar.fill.setVisible(true);
      bar.label.setVisible(true);
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

function titleCaseTerrainId(terrainId: string): string {
  return terrainId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
