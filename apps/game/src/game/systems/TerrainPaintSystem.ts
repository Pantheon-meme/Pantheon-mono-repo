import Phaser from "phaser";
import type { System } from "../../ecs/System";
import type { World } from "../../ecs/World";
import { TerrainGrid } from "../components/TerrainGrid";
import { TerrainPainter } from "../components/TerrainPainter";

export class TerrainPaintSystem implements System {
  private readonly shiftKey?: Phaser.Input.Keyboard.Key;
  private readonly paintKey?: Phaser.Input.Keyboard.Key;
  private readonly eraseKey?: Phaser.Input.Keyboard.Key;
  private readonly clearKey?: Phaser.Input.Keyboard.Key;

  constructor(private readonly scene: Phaser.Scene) {
    this.scene.input.mouse?.disableContextMenu();
    this.shiftKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.paintKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.eraseKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.clearKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.C);
  }

  update(world: World): void {
    for (const [, grid, painter] of world.query(TerrainGrid, TerrainPainter)) {
      this.updateToolKeys(painter);
      this.paintFromPointer(grid, painter);
    }
  }

  private updateToolKeys(painter: TerrainPainter): void {
    if (this.paintKey && Phaser.Input.Keyboard.JustDown(this.paintKey)) {
      painter.activeTool = "paint";
    }

    if (this.eraseKey && Phaser.Input.Keyboard.JustDown(this.eraseKey)) {
      painter.activeTool = "erase";
    }
  }

  private paintFromPointer(grid: TerrainGrid, painter: TerrainPainter): void {
    if (this.clearKey && Phaser.Input.Keyboard.JustDown(this.clearKey)) {
      grid.clear();
      return;
    }

    const pointer = this.scene.input.activePointer;

    if (!pointer.isDown || pointer.middleButtonDown()) {
      return;
    }

    const cell = pointerToCell(this.scene, grid, pointer);

    if (!cell) {
      return;
    }

    const erase = painter.activeTool === "erase" || pointer.rightButtonDown() || this.shiftKey?.isDown;

    grid.set(cell.x, cell.y, !erase);
  }
}

export function pointerToCell(
  scene: Phaser.Scene,
  grid: TerrainGrid,
  pointer: Phaser.Input.Pointer,
): { x: number; y: number } | undefined {
  const worldPoint = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
  const x = Math.floor(worldPoint.x / grid.tileSize);
  const y = Math.floor(worldPoint.y / grid.tileSize);

  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
    return undefined;
  }

  return { x, y };
}
