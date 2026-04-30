import Phaser from "phaser";
import type { BiomeDefinition } from "../../biome/BiomeDefinitions";
import type { BiomeSurfacePlan } from "../../biome/BiomeSurfacePlan";

export class BiomeMinimap {
  rendered = false;
  legendExpanded = false;
  visible = true;

  constructor(
    public readonly container: Phaser.GameObjects.Container,
    public readonly background: Phaser.GameObjects.Rectangle,
    public readonly terrainLayer: Phaser.GameObjects.Graphics,
    public readonly regionLayer: Phaser.GameObjects.Graphics,
    public readonly overlayLayer: Phaser.GameObjects.Graphics,
    public readonly labelLayer: Phaser.GameObjects.Container,
    public readonly biome: BiomeDefinition,
    public readonly surfacePlan: BiomeSurfacePlan | undefined,
    public readonly width: number,
    public readonly height: number,
    public readonly legendWidth: number,
    public readonly screenX: number,
    public readonly screenY: number,
  ) {}
}
