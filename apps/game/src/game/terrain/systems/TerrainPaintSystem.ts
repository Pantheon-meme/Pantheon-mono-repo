import Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { TerrainGrid } from "../components/TerrainGrid";
import { TerrainMaterial } from "../components/TerrainMaterial";
import { TerrainPainter } from "../components/TerrainPainter";

export class TerrainPaintSystem implements System {
  private readonly shiftKey?: Phaser.Input.Keyboard.Key;
  private readonly clearKey?: Phaser.Input.Keyboard.Key;
  private readonly materialKeys = new Map<string, Phaser.Input.Keyboard.Key>();

  constructor(private readonly scene: Phaser.Scene) {
    this.scene.input.mouse?.disableContextMenu();
    this.shiftKey = this.scene.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.SHIFT,
    );
    this.clearKey = this.scene.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.C,
    );
  }

  update(world: World): void {
    const materials = world.query(TerrainGrid, TerrainMaterial);

    for (const [, painter] of world.query(TerrainPainter)) {
      this.updateMaterialKeys(painter, materials);

      const target = materials.find(
        ([, , material]) => material.id === painter.activeMaterialId,
      );

      if (target) {
        this.paintFromPointer(target[1], painter, materials);
      }
    }
  }

  private updateMaterialKeys(
    painter: TerrainPainter,
    materials: Array<[number, TerrainGrid, TerrainMaterial]>,
  ): void {
    const keyboard = this.scene.input.keyboard;

    if (!keyboard) {
      return;
    }

    for (const [, , material] of materials) {
      let key = this.materialKeys.get(material.id);

      if (!key) {
        key = keyboard.addKey(material.selectKey);
        this.materialKeys.set(material.id, key);
      }

      if (Phaser.Input.Keyboard.JustDown(key)) {
        painter.activeMaterialId = material.id;
      }
    }
  }

  private paintFromPointer(
    grid: TerrainGrid,
    painter: TerrainPainter,
    materials: Array<[number, TerrainGrid, TerrainMaterial]>,
  ): void {
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

    const erase = pointer.rightButtonDown() || this.shiftKey?.isDown;

    if (erase) {
      grid.set(cell.x, cell.y, false);
      return;
    }

    for (const [, otherGrid, material] of materials) {
      if (material.id !== painter.activeMaterialId) {
        otherGrid.set(cell.x, cell.y, false);
      }
    }

    grid.set(cell.x, cell.y, true);
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
