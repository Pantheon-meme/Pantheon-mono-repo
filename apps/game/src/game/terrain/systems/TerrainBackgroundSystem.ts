import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { TerrainBackground } from "../components/TerrainBackground";
import { TerrainGrid } from "../components/TerrainGrid";
import {
  getCameraTileWindow,
  getCenterTextureKey,
} from "./AutotileRenderSystem";

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
      const window = getCameraTileWindow(this.scene.cameras.main, grid);
      const windowKey = `${window.minX},${window.minY},${window.maxX},${window.maxY}`;

      if (
        background.renderedVersion === version &&
        background.renderedWindowKey === windowKey
      ) {
        continue;
      }

      this.renderBackground(grid, background, window);
      background.renderedVersion = version;
      background.renderedWindowKey = windowKey;
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
    window: ReturnType<typeof getCameraTileWindow>,
  ): void {
    background.container.removeAll(true);

    if (background.activeMode === "flat") {
      return;
    }

    for (let y = window.minY; y <= window.maxY; y += 1) {
      for (let x = window.minX; x <= window.maxX; x += 1) {
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
