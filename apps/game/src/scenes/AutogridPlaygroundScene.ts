import Phaser from "phaser";
import dirtAtlasUrl from "../../../../packages/assets/generated/autotiles/dirt/autotile-blob-7x7.png?url";
import vibrantGrassAtlasUrl from "../../../../packages/assets/generated/autotiles/vibrant-grass/autotile-blob-7x7.png?url";
import waterAtlasUrl from "../../../../packages/assets/generated/autotiles/water/autotile-blob-7x7.png?url";
import { World } from "../ecs/World";
import { blobAtlasCellSize } from "../game/autotile/BlobAutotile";
import { AutotileLayer } from "../game/components/AutotileLayer";
import { TerrainBaseLayer } from "../game/components/TerrainBaseLayer";
import { TerrainBackground } from "../game/components/TerrainBackground";
import { TerrainCursor } from "../game/components/TerrainCursor";
import { TerrainGrid } from "../game/components/TerrainGrid";
import { TerrainHelpOverlay } from "../game/components/TerrainHelpOverlay";
import { TerrainLayer } from "../game/components/TerrainLayer";
import { TerrainMaterial } from "../game/components/TerrainMaterial";
import { TerrainPainter } from "../game/components/TerrainPainter";
import { AutotileRenderSystem } from "../game/systems/AutotileRenderSystem";
import { TerrainBackgroundSystem } from "../game/systems/TerrainBackgroundSystem";
import { TerrainBaseRenderSystem } from "../game/systems/TerrainBaseRenderSystem";
import { TerrainCursorSystem } from "../game/systems/TerrainCursorSystem";
import { TerrainHelpOverlaySystem } from "../game/systems/TerrainHelpOverlaySystem";
import { TerrainPaintSystem } from "../game/systems/TerrainPaintSystem";

const dirtAtlasKey = "dirt-blob-7x7";
const vibrantGrassAtlasKey = "vibrant-grass-blob-7x7";
const waterAtlasKey = "water-blob-7x7";
const gridWidth = 120;
const gridHeight = 120;
const tileSize = 256;
const worldWidth = gridWidth * tileSize;
const worldHeight = gridHeight * tileSize;

export class AutogridPlaygroundScene extends Phaser.Scene {
  private world?: World;
  private isPanning = false;
  private panStart?: Phaser.Math.Vector2;
  private cameraStart?: Phaser.Math.Vector2;

  constructor() {
    super("autogrid-playground");
  }

  preload(): void {
    this.load.image(dirtAtlasKey, dirtAtlasUrl);
    this.load.image(vibrantGrassAtlasKey, vibrantGrassAtlasUrl);
    this.load.image(waterAtlasKey, waterAtlasUrl);
  }

  create(): void {
    const world = new World();
    const baseTerrain = world.createEntity();
    const backgroundTerrain = world.createEntity();
    const dirtTerrain = world.createEntity();
    const grassTerrain = world.createEntity();
    const waterTerrain = world.createEntity();
    const painter = world.createEntity();
    const helpOverlay = world.createEntity();
    const baseGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const dirtGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const grassGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const waterGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const backgroundLayer = this.add.container(0, 0).setDepth(1);
    const dirtLayer = this.add.container(0, 0).setDepth(2);
    const grassLayer = this.add.container(0, 0).setDepth(3);
    const waterLayer = this.add.container(0, 0).setDepth(4);
    const cursorLayer = this.add.graphics().setDepth(5);

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.centerOn(worldWidth / 2, worldHeight / 2);
    this.cameras.main.setZoom(0.16);

    seedDirtPatch(dirtGrid);

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
        backgroundLayer,
        ["flat", "dirt", "vibrant-grass", "water"],
        "flat",
      ),
    );

    world.addComponent(dirtTerrain, TerrainGrid, dirtGrid);
    world.addComponent(dirtTerrain, TerrainLayer, new TerrainLayer("dirt", 20));
    world.addComponent(
      dirtTerrain,
      TerrainMaterial,
      new TerrainMaterial("dirt", Phaser.Input.Keyboard.KeyCodes.D, 0xffd080),
    );
    world.addComponent(
      dirtTerrain,
      AutotileLayer,
      new AutotileLayer(dirtLayer, dirtAtlasKey, "dirt", blobAtlasCellSize),
    );

    world.addComponent(grassTerrain, TerrainGrid, grassGrid);
    world.addComponent(
      grassTerrain,
      TerrainLayer,
      new TerrainLayer("vibrant-grass", 30),
    );
    world.addComponent(
      grassTerrain,
      TerrainMaterial,
      new TerrainMaterial(
        "vibrant-grass",
        Phaser.Input.Keyboard.KeyCodes.G,
        0x9dff7a,
      ),
    );
    world.addComponent(
      grassTerrain,
      AutotileLayer,
      new AutotileLayer(
        grassLayer,
        vibrantGrassAtlasKey,
        "vibrant-grass",
        blobAtlasCellSize,
      ),
    );

    world.addComponent(waterTerrain, TerrainGrid, waterGrid);
    world.addComponent(
      waterTerrain,
      TerrainLayer,
      new TerrainLayer("water", 40),
    );
    world.addComponent(
      waterTerrain,
      TerrainMaterial,
      new TerrainMaterial("water", Phaser.Input.Keyboard.KeyCodes.W, 0x7bd7ff),
    );
    world.addComponent(
      waterTerrain,
      AutotileLayer,
      new AutotileLayer(waterLayer, waterAtlasKey, "water", blobAtlasCellSize),
    );

    world.addComponent(painter, TerrainPainter, new TerrainPainter("dirt"));
    world.addComponent(painter, TerrainCursor, new TerrainCursor(cursorLayer));
    world.addComponent(
      helpOverlay,
      TerrainHelpOverlay,
      new TerrainHelpOverlay(this.createHelpText()),
    );

    world.addSystem(new TerrainBaseRenderSystem());
    world.addSystem(new AutotileRenderSystem(this));
    world.addSystem(new TerrainBackgroundSystem(this));
    world.addSystem(new TerrainPaintSystem(this));
    world.addSystem(new TerrainCursorSystem());
    world.addSystem(new TerrainHelpOverlaySystem());

    this.registerCameraInput();
    this.world = world;
  }

  private createHelpText(): Phaser.GameObjects.Text {
    return this.add
      .text(24, 24, "", {
        backgroundColor: "rgba(12, 18, 24, 0.82)",
        color: "#eef7f4",
        fixedWidth: 560,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "24px",
        lineSpacing: 8,
        padding: { x: 18, y: 16 },
      })
      .setScrollFactor(0)
      .setDepth(1000);
  }

  update(_time: number, delta: number): void {
    this.world?.update(delta / 1000);
  }

  private registerCameraInput(): void {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonDown()) {
        this.startPan(pointer);
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.isPanning) {
        this.panCamera(pointer);
      }
    });

    this.input.on("pointerup", () => {
      this.isPanning = false;
    });

    this.input.on(
      "wheel",
      (
        pointer: Phaser.Input.Pointer,
        _gameObjects: Phaser.GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number,
      ) => {
        const camera = this.cameras.main;
        const nextZoom = Phaser.Math.Clamp(
          camera.zoom * (deltaY > 0 ? 0.9 : 1.1),
          0.08,
          2.8,
        );
        const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);

        camera.setZoom(nextZoom);
        camera.scrollX = worldPoint.x - pointer.x / nextZoom;
        camera.scrollY = worldPoint.y - pointer.y / nextZoom;
      },
    );
  }

  private startPan(pointer: Phaser.Input.Pointer): void {
    this.isPanning = true;
    this.panStart = new Phaser.Math.Vector2(pointer.x, pointer.y);
    this.cameraStart = new Phaser.Math.Vector2(
      this.cameras.main.scrollX,
      this.cameras.main.scrollY,
    );
  }

  private panCamera(pointer: Phaser.Input.Pointer): void {
    if (!this.panStart || !this.cameraStart) {
      return;
    }

    const camera = this.cameras.main;
    camera.scrollX =
      this.cameraStart.x - (pointer.x - this.panStart.x) / camera.zoom;
    camera.scrollY =
      this.cameraStart.y - (pointer.y - this.panStart.y) / camera.zoom;
  }
}

function seedDirtPatch(grid: TerrainGrid): void {
  const centerX = Math.floor(grid.width / 2);
  const centerY = Math.floor(grid.height / 2);

  for (let y = -4; y <= 4; y += 1) {
    for (let x = -6; x <= 6; x += 1) {
      const distance = Math.abs(x) * 0.9 + Math.abs(y) * 1.25;

      if (distance < 6.5 && hash01(centerX + x, centerY + y) > 0.12) {
        grid.set(centerX + x, centerY + y, true);
      }
    }
  }
}

function hash01(x: number, y: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;

  return value - Math.floor(value);
}
