import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { TerrainBackground } from "../components/TerrainBackground";
import { TerrainGrid } from "../components/TerrainGrid";
import { getCenterTextureKey } from "./AutotileRenderSystem";

export class TerrainBackgroundSystem implements System {
  private readonly nextBackgroundKey?: Phaser.Input.Keyboard.Key;

  constructor(private readonly scene: Phaser.Scene) {
    this.nextBackgroundKey = this.scene.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.B,
    );
  }

  update(world: World): void {
    for (const [, grid, background] of world.query(
      TerrainGrid,
      TerrainBackground,
    )) {
      this.updateMode(background);

      const version = background.modes.indexOf(background.activeMode);

      if (background.renderedVersion === version) {
        continue;
      }

      this.renderBackground(grid, background);
      background.renderedVersion = version;
    }
  }

  private updateMode(background: TerrainBackground): void {
    if (
      !this.nextBackgroundKey ||
      !Phaser.Input.Keyboard.JustDown(this.nextBackgroundKey)
    ) {
      return;
    }

    const currentIndex = background.modes.indexOf(background.activeMode);
    const nextIndex = (currentIndex + 1) % background.modes.length;

    background.activeMode = background.modes[nextIndex];
  }

  private renderBackground(
    grid: TerrainGrid,
    background: TerrainBackground,
  ): void {
    background.container.removeAll(true);

    if (background.activeMode === "flat") {
      return;
    }

    for (let y = 0; y < grid.height; y += 1) {
      for (let x = 0; x < grid.width; x += 1) {
        const sprite = this.scene.add
          .image(
            x * grid.tileSize,
            y * grid.tileSize,
            getCenterTextureKey(this.scene, background.activeMode, x, y),
          )
          .setOrigin(0)
          .setDisplaySize(grid.tileSize, grid.tileSize);

        background.container.add(sprite);
      }
    }
  }
}
