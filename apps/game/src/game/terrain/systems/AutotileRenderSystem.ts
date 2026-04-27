import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import {
  buildBlobAtlasSlotLookup,
  blobTextureKey,
} from "../autotile/BlobAutotile";
import { AutotileLayer } from "../components/AutotileLayer";
import { parseCellKey, TerrainGrid } from "../components/TerrainGrid";

type NeighborMask = {
  mask: number;
};

export class AutotileRenderSystem implements System {
  private readonly atlasSlots = buildBlobAtlasSlotLookup();
  private readonly initializedTexturePrefixes = new Set<string>();

  constructor(private readonly scene: Phaser.Scene) {}

  update(world: World): void {
    for (const [, grid, layer] of world.query(TerrainGrid, AutotileLayer)) {
      this.ensureTileTextures(layer);

      if (layer.renderedVersion === grid.version) {
        continue;
      }

      layer.container.removeAll(true);

      for (const key of grid.cells) {
        const { x, y } = parseCellKey(key);
        const { mask } = getNeighborMask(grid, x, y);
        const sprite = this.scene.add
          .image(
            x * grid.tileSize,
            y * grid.tileSize,
            blobTextureKey(layer.texturePrefix, mask),
          )
          .setOrigin(0)
          .setDisplaySize(grid.tileSize, grid.tileSize);

        layer.container.add(sprite);
      }

      layer.renderedVersion = grid.version;
    }
  }

  private ensureTileTextures(layer: AutotileLayer): void {
    if (this.initializedTexturePrefixes.has(layer.texturePrefix)) {
      return;
    }

    for (const [mask, slot] of this.atlasSlots) {
      const source = this.scene.textures
        .get(layer.atlasKey)
        .getSourceImage() as HTMLImageElement | HTMLCanvasElement;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });

      canvas.width = layer.sourceTileSize;
      canvas.height = layer.sourceTileSize;

      if (!context) {
        continue;
      }

      context.drawImage(
        source,
        slot.column * layer.sourceTileSize,
        slot.row * layer.sourceTileSize,
        layer.sourceTileSize,
        layer.sourceTileSize,
        0,
        0,
        layer.sourceTileSize,
        layer.sourceTileSize,
      );

      const imageData = context.getImageData(
        0,
        0,
        layer.sourceTileSize,
        layer.sourceTileSize,
      );
      const pixels = imageData.data;

      for (let i = 0; i < pixels.length; i += 4) {
        if (isSheetBackground(pixels[i], pixels[i + 1], pixels[i + 2])) {
          pixels[i + 3] = 0;
        }
      }

      context.putImageData(imageData, 0, 0);
      this.scene.textures.addCanvas(
        blobTextureKey(layer.texturePrefix, mask),
        canvas,
      );
    }

    this.initializedTexturePrefixes.add(layer.texturePrefix);
  }
}

export function getNeighborMask(
  grid: TerrainGrid,
  x: number,
  y: number,
): NeighborMask {
  const n = grid.has(x, y - 1);
  const e = grid.has(x + 1, y);
  const s = grid.has(x, y + 1);
  const w = grid.has(x - 1, y);
  const ne = n && e && grid.has(x + 1, y - 1);
  const se = s && e && grid.has(x + 1, y + 1);
  const sw = s && w && grid.has(x - 1, y + 1);
  const nw = n && w && grid.has(x - 1, y - 1);

  let mask = 0;
  mask |= se ? 1 << 0 : 0;
  mask |= s ? 1 << 1 : 0;
  mask |= sw ? 1 << 2 : 0;
  mask |= e ? 1 << 3 : 0;
  mask |= w ? 1 << 4 : 0;
  mask |= ne ? 1 << 5 : 0;
  mask |= n ? 1 << 6 : 0;
  mask |= nw ? 1 << 7 : 0;

  return { mask };
}

function isSheetBackground(red: number, green: number, blue: number): boolean {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);

  return max - min < 18 && red > 90 && green > 90 && blue > 90;
}
