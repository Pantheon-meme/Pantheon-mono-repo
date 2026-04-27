import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { TerrainBackground } from "../components/TerrainBackground";
import { TerrainHelpOverlay } from "../components/TerrainHelpOverlay";
import { TerrainMaterial } from "../components/TerrainMaterial";
import { TerrainPainter } from "../components/TerrainPainter";

export class TerrainHelpOverlaySystem implements System {
  update(world: World): void {
    const painter = world.query(TerrainPainter)[0]?.[1];
    const background = world.query(TerrainBackground)[0]?.[1];
    const materials = world
      .query(TerrainMaterial)
      .map(([, material]) => material);

    for (const [, overlay] of world.query(TerrainHelpOverlay)) {
      const activeMaterial = materials.find(
        (material) => material.id === painter?.activeMaterialId,
      );

      overlay.text.setText(
        [
          "Autotile Playground",
          `Brush: ${label(activeMaterial?.id ?? "none")}  |  Background: ${label(background?.activeMode ?? "flat")}`,
          "D dirt  |  G grass  |  W water",
          "B cycle background  |  C clear selected brush",
          "Left drag paint  |  Right/Shift drag erase",
          "Wheel zoom  |  Middle drag pan",
        ].join("\n"),
      );
    }
  }
}

function label(value: string): string {
  return value
    .split("-")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
