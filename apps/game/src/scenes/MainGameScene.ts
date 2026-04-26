import Phaser from "phaser";
import dirtAtlasUrl from "../../../../packages/assets/generated/autotiles/dirt/autotile-blob-7x7.png?url";
import grassAtlasUrl from "../../../../packages/assets/generated/autotiles/vibrant-grass/autotile-blob-7x7.png?url";
import { World } from "../ecs/World";
import { blobAtlasCellSize } from "../game/autotile/BlobAutotile";
import { ActionBindings } from "../game/components/ActionBindings";
import { ActionLog } from "../game/components/ActionLog";
import { ActionQueue } from "../game/components/ActionQueue";
import { AutotileLayer } from "../game/components/AutotileLayer";
import { DayNightOverlay } from "../game/components/DayNightOverlay";
import { Energy } from "../game/components/Energy";
import { EnergyBar } from "../game/components/EnergyBar";
import { FacingDirection } from "../game/components/FacingDirection";
import { GameClock } from "../game/components/GameClock";
import { GridTargetHighlight } from "../game/components/GridTargetHighlight";
import { InputState } from "../game/components/InputState";
import { PlayerControlled } from "../game/components/PlayerControlled";
import { Position } from "../game/components/Position";
import { Renderable } from "../game/components/Renderable";
import { TerrainBackground } from "../game/components/TerrainBackground";
import { TerrainBaseLayer } from "../game/components/TerrainBaseLayer";
import { TerrainGrid } from "../game/components/TerrainGrid";
import { TerrainLayer } from "../game/components/TerrainLayer";
import { Velocity } from "../game/components/Velocity";
import { AutotileRenderSystem } from "../game/systems/AutotileRenderSystem";
import { ActionInputSystem } from "../game/systems/ActionInputSystem";
import { ActionSystem } from "../game/systems/ActionSystem";
import { BoundsSystem } from "../game/systems/BoundsSystem";
import { DayNightRenderSystem } from "../game/systems/DayNightRenderSystem";
import { EnergyBarSystem } from "../game/systems/EnergyBarSystem";
import { EnergySystem } from "../game/systems/EnergySystem";
import { FacingDirectionSystem } from "../game/systems/FacingDirectionSystem";
import { GameClockSystem } from "../game/systems/GameClockSystem";
import { GridTargetHighlightSystem } from "../game/systems/GridTargetHighlightSystem";
import { InputSystem } from "../game/systems/InputSystem";
import { MovementSystem } from "../game/systems/MovementSystem";
import { RenderSystem } from "../game/systems/RenderSystem";
import { TerrainBackgroundSystem } from "../game/systems/TerrainBackgroundSystem";
import { TerrainBaseRenderSystem } from "../game/systems/TerrainBaseRenderSystem";

const grassAtlasKey = "main-vibrant-grass-blob-7x7";
const dirtAtlasKey = "main-dirt-blob-7x7";
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
    this.load.image(dirtAtlasKey, dirtAtlasUrl);
  }

  create(): void {
    const world = new World();
    const baseTerrain = world.createEntity();
    const backgroundTerrain = world.createEntity();
    const atlasWarmupTerrain = world.createEntity();
    const dirtTerrain = world.createEntity();
    const time = world.createEntity();
    const dayNight = world.createEntity();
    const player = world.createEntity();
    const baseGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const warmupGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const dirtGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const spawnX = worldWidth / 2;
    const spawnY = worldHeight / 2;
    const playerSprite = this.add
      .circle(spawnX, spawnY, 34, 0xf2c15f)
      .setDepth(10);
    const energyBar = this.createEnergyBar();
    const dayNightOverlay = this.createDayNightOverlay();

    playerSprite.setStrokeStyle(5, 0x3a2514, 0.95);

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setZoom(0.7);
    this.cameras.main.startFollow(playerSprite, true, 0.12, 0.12);

    world.addComponent(baseTerrain, TerrainGrid, baseGrid);
    world.addComponent(
      baseTerrain,
      TerrainBaseLayer,
      new TerrainBaseLayer(
        this.add.graphics().setDepth(0),
        0x496f50,
        0x547a59,
        0x213d2a,
      ),
    );

    world.addComponent(backgroundTerrain, TerrainGrid, baseGrid);
    world.addComponent(
      backgroundTerrain,
      TerrainBackground,
      new TerrainBackground(
        this.add.container(0, 0).setDepth(1),
        ["vibrant-grass"],
        "vibrant-grass",
      ),
    );

    world.addComponent(atlasWarmupTerrain, TerrainGrid, warmupGrid);
    world.addComponent(
      atlasWarmupTerrain,
      AutotileLayer,
      new AutotileLayer(
        this.add.container(0, 0).setDepth(-1),
        grassAtlasKey,
        "vibrant-grass",
        blobAtlasCellSize,
      ),
    );

    world.addComponent(dirtTerrain, TerrainGrid, dirtGrid);
    world.addComponent(dirtTerrain, TerrainLayer, new TerrainLayer("dirt", 20));
    world.addComponent(
      dirtTerrain,
      AutotileLayer,
      new AutotileLayer(
        this.add.container(0, 0).setDepth(2),
        dirtAtlasKey,
        "main-dirt",
        blobAtlasCellSize,
      ),
    );

    world.addComponent(time, GameClock, new GameClock());
    world.addComponent(dayNight, DayNightOverlay, dayNightOverlay);

    world.addComponent(player, PlayerControlled, new PlayerControlled());
    world.addComponent(player, InputState, new InputState());
    world.addComponent(player, FacingDirection, new FacingDirection(0, 1));
    world.addComponent(player, Position, new Position(spawnX, spawnY));
    world.addComponent(player, Velocity, new Velocity(0, 0, 620));
    world.addComponent(player, Energy, new Energy(100, 100, 0));
    world.addComponent(player, ActionQueue, new ActionQueue());
    world.addComponent(
      player,
      ActionBindings,
      new ActionBindings({
        [Phaser.Input.Keyboard.KeyCodes.SPACE]: "gather",
        [Phaser.Input.Keyboard.KeyCodes.F]: "dig",
        [Phaser.Input.Keyboard.KeyCodes.R]: "rest",
        [Phaser.Input.Keyboard.KeyCodes.E]: "inspect",
      }),
    );
    world.addComponent(player, ActionLog, new ActionLog());
    world.addComponent(player, EnergyBar, energyBar);
    world.addComponent(player, Renderable, new Renderable(playerSprite));
    world.addComponent(
      player,
      GridTargetHighlight,
      new GridTargetHighlight(this.add.graphics().setDepth(9)),
    );

    const keyboard = this.input.keyboard;

    if (!keyboard) {
      throw new Error("Keyboard input is unavailable.");
    }

    world.addSystem(new TerrainBaseRenderSystem());
    world.addSystem(new AutotileRenderSystem(this));
    world.addSystem(new TerrainBackgroundSystem(this));
    world.addSystem(
      new InputSystem(
        keyboard.createCursorKeys(),
        keyboard.addKeys("W,A,S,D") as Record<
          "W" | "A" | "S" | "D",
          Phaser.Input.Keyboard.Key
        >,
      ),
    );
    world.addSystem(new ActionInputSystem(keyboard));
    world.addSystem(new ActionSystem());
    world.addSystem(new GameClockSystem());
    world.addSystem(new EnergySystem());
    world.addSystem(new FacingDirectionSystem());
    world.addSystem(new MovementSystem());
    world.addSystem(
      new BoundsSystem(
        new Phaser.Geom.Rectangle(34, 34, worldWidth - 68, worldHeight - 68),
      ),
    );
    world.addSystem(new GridTargetHighlightSystem());
    world.addSystem(new RenderSystem());
    world.addSystem(new DayNightRenderSystem());
    world.addSystem(new EnergyBarSystem());

    this.world = world;
  }

  update(_time: number, delta: number): void {
    this.world?.update(delta / 1000);
  }

  private createEnergyBar(): EnergyBar {
    const width = 360;
    const height = 24;
    const x = 18;
    const y = 18;
    const background = this.add
      .rectangle(x, y, width, height, 0x17222a, 0.92)
      .setOrigin(0)
      .setDepth(100);
    const fill = this.add
      .rectangle(x, y, width, height, 0x66d685, 1)
      .setOrigin(0)
      .setDepth(101);
    const label = this.add
      .text(x, y + height + 6, "", {
        color: "#eef7f4",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "18px",
      })
      .setDepth(101);

    background.setStrokeStyle(2, 0xe8f0e8, 0.55);

    return new EnergyBar(background, fill, label, width, height, x, y);
  }

  private createDayNightOverlay(): DayNightOverlay {
    const shade = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x07142a, 0)
      .setOrigin(0)
      .setDepth(90);
    const label = this.add
      .text(0, 0, "", {
        align: "right",
        color: "#eef7f4",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "18px",
        lineSpacing: 4,
        shadow: {
          color: "#071018",
          blur: 4,
          fill: true,
          offsetX: 1,
          offsetY: 1,
        },
      })
      .setOrigin(1, 0)
      .setDepth(101);

    return new DayNightOverlay(shade, label, 18, 18);
  }
}
