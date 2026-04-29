import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import {
  buildBlobAtlasSlotLookup,
  blobCenterVariantTextureKey,
  blobTextureKey,
} from "../autotile/BlobAutotile";
import { AutotileLayer } from "../components/AutotileLayer";
import { parseCellKey, TerrainGrid } from "../components/TerrainGrid";

type NeighborMask = {
  mask: number;
};

const filledTileMask = 255;

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
        const textureKey =
          mask === filledTileMask
            ? getCenterTextureKey(this.scene, layer.texturePrefix, x, y)
            : blobTextureKey(layer.texturePrefix, mask);
        const sprite = this.scene.add
          .image(x * grid.tileSize, y * grid.tileSize, textureKey)
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

    this.ensureCenterVariantTextures(layer);

    this.initializedTexturePrefixes.add(layer.texturePrefix);
  }

  private ensureCenterVariantTextures(layer: AutotileLayer): void {
    if (!layer.centerVariantAtlasKey) {
      return;
    }

    const expectedWidth = layer.sourceTileSize * layer.centerVariantColumns;
    const expectedHeight = layer.sourceTileSize * layer.centerVariantRows;
    const source = this.scene.textures
      .get(layer.centerVariantAtlasKey)
      .getSourceImage() as HTMLImageElement | HTMLCanvasElement;

    if (
      !source ||
      source.width < expectedWidth ||
      source.height < expectedHeight
    ) {
      console.warn(
        `[terrain] Skipping center variants for ${layer.texturePrefix}; expected ${expectedWidth}x${expectedHeight}, got ${source?.width ?? 0}x${source?.height ?? 0}.`,
      );
      return;
    }

    const variantCount = layer.centerVariantColumns * layer.centerVariantRows;

    for (let variant = 0; variant < variantCount; variant += 1) {
      const column = variant % layer.centerVariantColumns;
      const row = Math.floor(variant / layer.centerVariantColumns);
      const textureKey = blobCenterVariantTextureKey(
        layer.texturePrefix,
        variant,
      );
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });

      canvas.width = layer.sourceTileSize;
      canvas.height = layer.sourceTileSize;

      if (!context) {
        continue;
      }

      context.drawImage(
        source,
        column * layer.sourceTileSize,
        row * layer.sourceTileSize,
        layer.sourceTileSize,
        layer.sourceTileSize,
        0,
        0,
        layer.sourceTileSize,
        layer.sourceTileSize,
      );

      if (this.scene.textures.exists(textureKey)) {
        this.scene.textures.remove(textureKey);
      }

      this.scene.textures.addCanvas(textureKey, canvas);
    }
  }
}

export function getCenterTextureKey(
  scene: Phaser.Scene,
  texturePrefix: string,
  x: number,
  y: number,
): string {
  const variant = hashVariant(x, y, 16);
  const variantKey = blobCenterVariantTextureKey(texturePrefix, variant);

  return scene.textures.exists(variantKey)
    ? variantKey
    : blobTextureKey(texturePrefix, filledTileMask);
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

function hashVariant(x: number, y: number, variants: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  const normalized = value - Math.floor(value);

  return Math.floor(normalized * variants) % variants;
}
