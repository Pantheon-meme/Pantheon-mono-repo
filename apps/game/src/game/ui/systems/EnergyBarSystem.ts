import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import type { BiomeDefinition } from "../../biome/BiomeDefinitions";
import { BiomeRegionAwareness } from "../../biome/components/BiomeRegionAwareness";
import { Energy } from "../../energy/components/Energy";
import { FocusTarget } from "../../player/components/FocusTarget";
import { PlayerControlled } from "../../player/components/PlayerControlled";
import { getTopTerrainLayerAtCell } from "../../terrain/TerrainLayers";
import { EnergyBar } from "../components/EnergyBar";

const fillWidthEpsilon = 0.25;
const fillIncreaseTransitionSeconds = 0.26;
const fillDecreaseTransitionSeconds = 0.18;
const fillPulseSeconds = 0.18;

export class EnergyBarSystem implements System {
  constructor(private readonly biome: BiomeDefinition) {}

  update(world: World, deltaSeconds: number): void {
    const playerFocus = world.query(
      PlayerControlled,
      BiomeRegionAwareness,
      FocusTarget,
    )[0];
    const regionAwareness = playerFocus?.[2];
    const focus = playerFocus?.[3];
    const regionLine = this.getRegionLine(world, regionAwareness, focus);

    for (const [, energy, bar] of world.query(Energy, EnergyBar)) {
      const ratio = clampRatio(energy.max === 0 ? 0 : energy.current / energy.max);
      const fillWidth = Math.max(0, bar.width * ratio);
      const camera = bar.container.scene.cameras.main;
      const cameraScale = 1 / camera.zoom;
      const scale = getScreenScale(camera.width, bar) * cameraScale;
      const worldX = camera.worldView.x + bar.screenX * cameraScale;
      const worldY = camera.worldView.y + bar.screenY * cameraScale;

      bar.container.setPosition(worldX, worldY);
      bar.container.setScale(scale);
      updateFillTransition(bar, fillWidth, deltaSeconds);
      bar.value.setText(`${Math.round(energy.current)} / ${Math.round(energy.max)}`);
      bar.region.setText(regionLine.trim());
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

function clampRatio(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function updateFillTransition(
  bar: EnergyBar,
  targetFillWidth: number,
  deltaSeconds: number,
): void {
  if (bar.displayedFillWidth === undefined) {
    bar.displayedFillWidth = targetFillWidth;
    bar.fillTransitionStartWidth = targetFillWidth;
    bar.fillTransitionTargetWidth = targetFillWidth;
    applyFillWidth(bar, targetFillWidth);
    return;
  }

  if (
    Math.abs(targetFillWidth - bar.fillTransitionTargetWidth) >
    fillWidthEpsilon
  ) {
    bar.fillTransitionStartWidth = bar.displayedFillWidth;
    bar.fillTransitionTargetWidth = targetFillWidth;
    bar.fillTransitionElapsed = 0;
    bar.fillTransitionDuration =
      targetFillWidth > bar.displayedFillWidth
        ? fillIncreaseTransitionSeconds
        : fillDecreaseTransitionSeconds;
    bar.fillPulseElapsed = fillPulseSeconds;
  }

  if (bar.fillTransitionElapsed < bar.fillTransitionDuration) {
    bar.fillTransitionElapsed = Math.min(
      bar.fillTransitionDuration,
      bar.fillTransitionElapsed + deltaSeconds,
    );

    const progress =
      bar.fillTransitionDuration === 0
        ? 1
        : bar.fillTransitionElapsed / bar.fillTransitionDuration;
    bar.displayedFillWidth = lerp(
      bar.fillTransitionStartWidth,
      bar.fillTransitionTargetWidth,
      easeOutCubic(progress),
    );
  } else {
    bar.displayedFillWidth = bar.fillTransitionTargetWidth;
  }

  applyFillWidth(bar, bar.displayedFillWidth);
  updateFillPulse(bar, deltaSeconds);
}

function applyFillWidth(bar: EnergyBar, fillWidth: number): void {
  bar.fill.setVisible(fillWidth > 0);
  bar.fill.setSize(fillWidth, bar.height);
}

function updateFillPulse(bar: EnergyBar, deltaSeconds: number): void {
  if (bar.fillPulseElapsed <= 0) {
    bar.fill.clearTint();
    bar.fill.setAlpha(1);
    return;
  }

  bar.fillPulseElapsed = Math.max(0, bar.fillPulseElapsed - deltaSeconds);

  const progress = 1 - bar.fillPulseElapsed / fillPulseSeconds;
  const pulse = Math.sin(progress * Math.PI);

  bar.fill.setTint(0xffffd2);
  bar.fill.setAlpha(1 - pulse * 0.12);
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

function getScreenScale(cameraWidth: number, bar: EnergyBar): number {
  const horizontalPadding = bar.screenX * 2;
  const availableWidth = cameraWidth - horizontalPadding;

  return Math.min(1, Math.max(0.1, availableWidth / bar.visualWidth));
}

function titleCaseTerrainId(terrainId: string): string {
  return terrainId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
