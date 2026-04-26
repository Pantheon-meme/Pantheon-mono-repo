import Phaser from "phaser";
import dirtAtlasUrl from "../../../../packages/assets/generated/autotiles/dirt/autotile-blob-7x7.png?url";
import { World } from "../ecs/World";
import { blobAtlasCellSize } from "../game/autotile/BlobAutotile";
import { AutotileLayer } from "../game/components/AutotileLayer";
import { TerrainBaseLayer } from "../game/components/TerrainBaseLayer";
import { TerrainCursor } from "../game/components/TerrainCursor";
import { TerrainGrid } from "../game/components/TerrainGrid";
import { TerrainPainter } from "../game/components/TerrainPainter";
import { AutotileRenderSystem } from "../game/systems/AutotileRenderSystem";
import { TerrainBaseRenderSystem } from "../game/systems/TerrainBaseRenderSystem";
import { TerrainCursorSystem } from "../game/systems/TerrainCursorSystem";
import { TerrainPaintSystem } from "../game/systems/TerrainPaintSystem";

const atlasKey = "dirt-blob-7x7";
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
    this.load.image(atlasKey, dirtAtlasUrl);
  }

  create(): void {
    const world = new World();
    const terrain = world.createEntity();
    const grid = new TerrainGrid(gridWidth, gridHeight, tileSize);

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.centerOn(worldWidth / 2, worldHeight / 2);
    this.cameras.main.setZoom(0.16);

    seedDirtPatch(grid);

    world.addComponent(terrain, TerrainGrid, grid);
    world.addComponent(terrain, TerrainPainter, new TerrainPainter());
    world.addComponent(terrain, TerrainBaseLayer, new TerrainBaseLayer(this.add.graphics(), 0x496f50, 0x547a59, 0x213d2a));
    world.addComponent(terrain, AutotileLayer, new AutotileLayer(this.add.container(0, 0), atlasKey, "dirt", blobAtlasCellSize));
    world.addComponent(terrain, TerrainCursor, new TerrainCursor(this.add.graphics()));

    world.addSystem(new TerrainBaseRenderSystem());
    world.addSystem(new TerrainPaintSystem(this));
    world.addSystem(new AutotileRenderSystem(this));
    world.addSystem(new TerrainCursorSystem());

    this.registerCameraInput();
    this.world = world;
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
        const nextZoom = Phaser.Math.Clamp(camera.zoom * (deltaY > 0 ? 0.9 : 1.1), 0.08, 2.8);
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
    this.cameraStart = new Phaser.Math.Vector2(this.cameras.main.scrollX, this.cameras.main.scrollY);
  }

  private panCamera(pointer: Phaser.Input.Pointer): void {
    if (!this.panStart || !this.cameraStart) {
      return;
    }

    const camera = this.cameras.main;
    camera.scrollX = this.cameraStart.x - (pointer.x - this.panStart.x) / camera.zoom;
    camera.scrollY = this.cameraStart.y - (pointer.y - this.panStart.y) / camera.zoom;
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
