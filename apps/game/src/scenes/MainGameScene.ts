import Phaser from "phaser";
import grassAtlasUrl from "../../../../packages/assets/generated/autotiles/vibrant-grass/autotile-blob-7x7.png?url";
import { World } from "../ecs/World";
import { blobAtlasCellSize } from "../game/autotile/BlobAutotile";
import { AutotileLayer } from "../game/components/AutotileLayer";
import { FacingDirection } from "../game/components/FacingDirection";
import { GridTargetHighlight } from "../game/components/GridTargetHighlight";
import { InputState } from "../game/components/InputState";
import { PlayerControlled } from "../game/components/PlayerControlled";
import { Position } from "../game/components/Position";
import { Renderable } from "../game/components/Renderable";
import { TerrainBackground } from "../game/components/TerrainBackground";
import { TerrainBaseLayer } from "../game/components/TerrainBaseLayer";
import { TerrainGrid } from "../game/components/TerrainGrid";
import { Velocity } from "../game/components/Velocity";
import { AutotileRenderSystem } from "../game/systems/AutotileRenderSystem";
import { BoundsSystem } from "../game/systems/BoundsSystem";
import { FacingDirectionSystem } from "../game/systems/FacingDirectionSystem";
import { GridTargetHighlightSystem } from "../game/systems/GridTargetHighlightSystem";
import { InputSystem } from "../game/systems/InputSystem";
import { MovementSystem } from "../game/systems/MovementSystem";
import { RenderSystem } from "../game/systems/RenderSystem";
import { TerrainBackgroundSystem } from "../game/systems/TerrainBackgroundSystem";
import { TerrainBaseRenderSystem } from "../game/systems/TerrainBaseRenderSystem";

const grassAtlasKey = "main-vibrant-grass-blob-7x7";
const tileSize = 256;
const gridWidth = 200;
const gridHeight = 200;
const worldWidth = gridWidth * tileSize;
const worldHeight = gridHeight * tileSize;

export class MainGameScene extends Phaser.Scene {
  private world?: World;

  constructor() {
    super("main-game");
  }

  preload(): void {
    this.load.image(grassAtlasKey, grassAtlasUrl);
  }

  create(): void {
    const world = new World();
    const baseTerrain = world.createEntity();
    const backgroundTerrain = world.createEntity();
    const atlasWarmupTerrain = world.createEntity();
    const player = world.createEntity();
    const baseGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const warmupGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const spawnX = worldWidth / 2;
    const spawnY = worldHeight / 2;
    const playerSprite = this.add.circle(spawnX, spawnY, 34, 0xf2c15f).setDepth(10);

    playerSprite.setStrokeStyle(5, 0x3a2514, 0.95);

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setZoom(0.7);
    this.cameras.main.startFollow(playerSprite, true, 0.12, 0.12);

    world.addComponent(baseTerrain, TerrainGrid, baseGrid);
    world.addComponent(baseTerrain, TerrainBaseLayer, new TerrainBaseLayer(this.add.graphics().setDepth(0), 0x496f50, 0x547a59, 0x213d2a));

    world.addComponent(backgroundTerrain, TerrainGrid, baseGrid);
    world.addComponent(
      backgroundTerrain,
      TerrainBackground,
      new TerrainBackground(this.add.container(0, 0).setDepth(1), ["vibrant-grass"], "vibrant-grass"),
    );

    world.addComponent(atlasWarmupTerrain, TerrainGrid, warmupGrid);
    world.addComponent(
      atlasWarmupTerrain,
      AutotileLayer,
      new AutotileLayer(this.add.container(0, 0).setDepth(-1), grassAtlasKey, "vibrant-grass", blobAtlasCellSize),
    );

    world.addComponent(player, PlayerControlled, new PlayerControlled());
    world.addComponent(player, InputState, new InputState());
    world.addComponent(player, FacingDirection, new FacingDirection(0, 1));
    world.addComponent(player, Position, new Position(spawnX, spawnY));
    world.addComponent(player, Velocity, new Velocity(0, 0, 620));
    world.addComponent(player, Renderable, new Renderable(playerSprite));
    world.addComponent(player, GridTargetHighlight, new GridTargetHighlight(this.add.graphics().setDepth(9)));

    const keyboard = this.input.keyboard;

    if (!keyboard) {
      throw new Error("Keyboard input is unavailable.");
    }

    world.addSystem(new TerrainBaseRenderSystem());
    world.addSystem(new AutotileRenderSystem(this));
    world.addSystem(new TerrainBackgroundSystem(this));
    world.addSystem(new InputSystem(keyboard.createCursorKeys(), keyboard.addKeys("W,A,S,D") as Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>));
    world.addSystem(new FacingDirectionSystem());
    world.addSystem(new MovementSystem());
    world.addSystem(new BoundsSystem(new Phaser.Geom.Rectangle(34, 34, worldWidth - 68, worldHeight - 68)));
    world.addSystem(new GridTargetHighlightSystem());
    world.addSystem(new RenderSystem());

    this.world = world;
  }

  update(_time: number, delta: number): void {
    this.world?.update(delta / 1000);
  }
}
