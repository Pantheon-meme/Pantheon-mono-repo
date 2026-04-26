import Phaser from "phaser";
import dirtLeftBottomUrl from "../../../../packages/assets/generated/autotiles/dirt/autotile-left-bottom.png?url";
import dirtLeftTopUrl from "../../../../packages/assets/generated/autotiles/dirt/autotile-left-top.png?url";
import dirtRightBottomUrl from "../../../../packages/assets/generated/autotiles/dirt/autotile-right-bottom.png?url";
import dirtRightTopAUrl from "../../../../packages/assets/generated/autotiles/dirt/autotile-right-top-a.png?url";
import dirtRightTopBUrl from "../../../../packages/assets/generated/autotiles/dirt/autotile-right-top-b.png?url";

const TILE_SIZE = 40;
const SOURCE_TILE_SIZE = 256;
const GRID_WIDTH = 120;
const GRID_HEIGHT = 120;
const WORLD_WIDTH = GRID_WIDTH * TILE_SIZE;
const WORLD_HEIGHT = GRID_HEIGHT * TILE_SIZE;

const DIRT_SHEETS = [
  { key: "dirt-left-top", url: dirtLeftTopUrl },
  { key: "dirt-right-top-a", url: dirtRightTopAUrl },
  { key: "dirt-right-top-b", url: dirtRightTopBUrl },
  { key: "dirt-left-bottom", url: dirtLeftBottomUrl },
  { key: "dirt-right-bottom", url: dirtRightBottomUrl },
] as const;

type GridPoint = {
  x: number;
  y: number;
};

export class AutogridPlaygroundScene extends Phaser.Scene {
  private readonly dirtCells = new Set<string>();
  private readonly blobLookup = buildBlob47Lookup();
  private baseLayer?: Phaser.GameObjects.Graphics;
  private dirtLayer?: Phaser.GameObjects.Container;
  private cursorLayer?: Phaser.GameObjects.Graphics;
  private label?: Phaser.GameObjects.Text;
  private shiftKey?: Phaser.Input.Keyboard.Key;
  private activeTool: "paint" | "erase" = "paint";
  private isPanning = false;
  private panStart?: Phaser.Math.Vector2;
  private cameraStart?: Phaser.Math.Vector2;

  constructor() {
    super("autogrid-playground");
  }

  preload(): void {
    for (const sheet of DIRT_SHEETS) {
      this.load.image(sheet.key, sheet.url);
    }
  }

  create(): void {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.cameras.main.setZoom(0.8);

    this.baseLayer = this.add.graphics();
    this.dirtLayer = this.add.container(0, 0);
    this.cursorLayer = this.add.graphics();

    this.createDirtTileTextures();
    this.drawBaseLayer();
    this.seedDirtPatch();
    this.redrawDirtLayer();
    this.createHud();
    this.registerInput();
  }

  update(): void {
    this.redrawCursor();
    this.updateHud();
  }

  private registerInput(): void {
    this.input.mouse?.disableContextMenu();

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonDown()) {
        this.startPan(pointer);
        return;
      }

      this.paintFromPointer(pointer, this.isShiftDown() || pointer.rightButtonDown() ? "erase" : this.activeTool);
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.isPanning) {
        this.panCamera(pointer);
        return;
      }

      if (pointer.isDown && !pointer.middleButtonDown()) {
        this.paintFromPointer(pointer, this.isShiftDown() || pointer.rightButtonDown() ? "erase" : this.activeTool);
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
        const oldZoom = camera.zoom;
        const nextZoom = Phaser.Math.Clamp(oldZoom * (deltaY > 0 ? 0.9 : 1.1), 0.35, 2.8);
        const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);

        camera.setZoom(nextZoom);
        camera.scrollX = worldPoint.x - pointer.x / nextZoom;
        camera.scrollY = worldPoint.y - pointer.y / nextZoom;
      },
    );

    const keyboard = this.input.keyboard;

    if (!keyboard) {
      return;
    }

    this.shiftKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    keyboard.on("keydown-ONE", () => {
      this.activeTool = "paint";
    });
    keyboard.on("keydown-TWO", () => {
      this.activeTool = "erase";
    });
    keyboard.on("keydown-C", () => {
      this.dirtCells.clear();
      this.redrawDirtLayer();
    });
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

  private paintFromPointer(pointer: Phaser.Input.Pointer, tool: "paint" | "erase"): void {
    const cell = this.pointerToCell(pointer);

    if (!cell) {
      return;
    }

    const key = cellKey(cell.x, cell.y);

    if (tool === "paint") {
      this.dirtCells.add(key);
    } else {
      this.dirtCells.delete(key);
    }

    this.redrawDirtLayer();
  }

  private pointerToCell(pointer: Phaser.Input.Pointer): GridPoint | undefined {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const x = Math.floor(worldPoint.x / TILE_SIZE);
    const y = Math.floor(worldPoint.y / TILE_SIZE);

    if (x < 0 || y < 0 || x >= GRID_WIDTH || y >= GRID_HEIGHT) {
      return undefined;
    }

    return { x, y };
  }

  private drawBaseLayer(): void {
    if (!this.baseLayer) {
      return;
    }

    this.baseLayer.clear();
    this.baseLayer.fillStyle(0x496f50, 1);
    this.baseLayer.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      for (let x = 0; x < GRID_WIDTH; x += 1) {
        const jitter = hash01(x, y);
        const color = jitter > 0.64 ? 0x547a59 : jitter < 0.18 ? 0x416648 : 0x496f50;

        this.baseLayer.fillStyle(color, 1);
        this.baseLayer.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    this.baseLayer.lineStyle(1, 0x213d2a, 0.22);

    for (let x = 0; x <= GRID_WIDTH; x += 1) {
      this.baseLayer.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, WORLD_HEIGHT);
    }

    for (let y = 0; y <= GRID_HEIGHT; y += 1) {
      this.baseLayer.lineBetween(0, y * TILE_SIZE, WORLD_WIDTH, y * TILE_SIZE);
    }
  }

  private seedDirtPatch(): void {
    const centerX = Math.floor(GRID_WIDTH / 2);
    const centerY = Math.floor(GRID_HEIGHT / 2);

    for (let y = -4; y <= 4; y += 1) {
      for (let x = -6; x <= 6; x += 1) {
        const distance = Math.abs(x) * 0.9 + Math.abs(y) * 1.25;

        if (distance < 6.5 && hash01(centerX + x, centerY + y) > 0.12) {
          this.dirtCells.add(cellKey(centerX + x, centerY + y));
        }
      }
    }
  }

  private redrawDirtLayer(): void {
    if (!this.dirtLayer) {
      return;
    }

    this.dirtLayer.removeAll(true);

    for (const key of this.dirtCells) {
      const [xText, yText] = key.split(",");
      const x = Number.parseInt(xText, 10);
      const y = Number.parseInt(yText, 10);

      this.drawDirtCell(x, y);
    }
  }

  private drawDirtCell(x: number, y: number): void {
    if (!this.dirtLayer) {
      return;
    }

    const left = x * TILE_SIZE;
    const top = y * TILE_SIZE;
    const neighbors = this.getNeighbors(x, y);
    const tileIndex = this.blobLookup.get(neighbors.mask) ?? 0;
    const sprite = this.add.image(left, top, dirtTextureKey(tileIndex)).setOrigin(0).setDisplaySize(TILE_SIZE, TILE_SIZE);

    sprite.setName(`dirt-${x}-${y}-${neighbors.mask}`);
    this.dirtLayer.add(sprite);
  }

  private redrawCursor(): void {
    if (!this.cursorLayer) {
      return;
    }

    this.cursorLayer.clear();

    const pointer = this.input.activePointer;
    const cell = this.pointerToCell(pointer);

    if (!cell) {
      return;
    }

    const x = cell.x * TILE_SIZE;
    const y = cell.y * TILE_SIZE;

    this.cursorLayer.lineStyle(2, this.activeTool === "paint" ? 0xffd080 : 0xf2f5f7, 0.95);
    this.cursorLayer.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
  }

  private createHud(): void {
    this.label = this.add
      .text(18, 16, "", {
        backgroundColor: "#111820",
        color: "#eef2f6",
        fixedWidth: 430,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "14px",
        lineSpacing: 5,
        padding: { x: 12, y: 10 },
      })
      .setScrollFactor(0)
      .setDepth(10);

    this.updateHud();
  }

  private updateHud(): void {
    if (!this.label) {
      return;
    }

    const cell = this.pointerToCell(this.input.activePointer);
    const mask = cell && this.hasDirt(cell.x, cell.y) ? this.getNeighbors(cell.x, cell.y).mask : 0;
    const tileIndex = this.blobLookup.get(mask) ?? 0;

    this.label.setText(
      [
        "Autogrid playground",
        `Tool: ${this.activeTool}  |  Dirt cells: ${this.dirtCells.size}`,
        `Hover mask: ${mask.toString(2).padStart(8, "0")}  |  47-tile slot: ${tileIndex}`,
        "Left drag paints, Shift/right-click erases, middle drag pans, wheel zooms, 1/2 swaps tools, C clears.",
      ].join("\n"),
    );
  }

  private getNeighbors(x: number, y: number): {
    n: boolean;
    ne: boolean;
    e: boolean;
    se: boolean;
    s: boolean;
    sw: boolean;
    w: boolean;
    nw: boolean;
    mask: number;
  } {
    const n = this.hasDirt(x, y - 1);
    const e = this.hasDirt(x + 1, y);
    const s = this.hasDirt(x, y + 1);
    const w = this.hasDirt(x - 1, y);
    const ne = n && e && this.hasDirt(x + 1, y - 1);
    const se = s && e && this.hasDirt(x + 1, y + 1);
    const sw = s && w && this.hasDirt(x - 1, y + 1);
    const nw = n && w && this.hasDirt(x - 1, y - 1);

    let mask = 0;
    mask |= n ? 1 << 0 : 0;
    mask |= ne ? 1 << 1 : 0;
    mask |= e ? 1 << 2 : 0;
    mask |= se ? 1 << 3 : 0;
    mask |= s ? 1 << 4 : 0;
    mask |= sw ? 1 << 5 : 0;
    mask |= w ? 1 << 6 : 0;
    mask |= nw ? 1 << 7 : 0;

    return { n, ne, e, se, s, sw, w, nw, mask };
  }

  private hasDirt(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < GRID_WIDTH && y < GRID_HEIGHT && this.dirtCells.has(cellKey(x, y));
  }

  private isShiftDown(): boolean {
    return Boolean(this.shiftKey?.isDown);
  }

  private createDirtTileTextures(): void {
    const slots = buildDirtAtlasSlots();

    slots.forEach((slot, index) => {
      const source = this.textures.get(slot.sheetKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });

      canvas.width = SOURCE_TILE_SIZE;
      canvas.height = SOURCE_TILE_SIZE;

      if (!context) {
        return;
      }

      context.drawImage(
        source,
        slot.x * SOURCE_TILE_SIZE,
        slot.y * SOURCE_TILE_SIZE,
        SOURCE_TILE_SIZE,
        SOURCE_TILE_SIZE,
        0,
        0,
        SOURCE_TILE_SIZE,
        SOURCE_TILE_SIZE,
      );

      const imageData = context.getImageData(0, 0, SOURCE_TILE_SIZE, SOURCE_TILE_SIZE);
      const pixels = imageData.data;

      for (let i = 0; i < pixels.length; i += 4) {
        if (isSheetBackground(pixels[i], pixels[i + 1], pixels[i + 2])) {
          pixels[i + 3] = 0;
        }
      }

      context.putImageData(imageData, 0, 0);
      this.textures.addCanvas(dirtTextureKey(index), canvas);
    });
  }
}

function buildDirtAtlasSlots(): { sheetKey: string; x: number; y: number }[] {
  return DIRT_SHEETS.flatMap((sheet) =>
    Array.from({ length: 16 }, (_, index) => ({
      sheetKey: sheet.key,
      x: index % 4,
      y: Math.floor(index / 4),
    })),
  ).slice(0, 47);
}

function dirtTextureKey(index: number): string {
  return `dirt-autotile-${index}`;
}

function isSheetBackground(red: number, green: number, blue: number): boolean {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);

  return max - min < 18 && red > 90 && green > 90 && blue > 90;
}

function buildBlob47Lookup(): Map<number, number> {
  const masks = new Set<number>();

  for (let mask = 0; mask < 256; mask += 1) {
    masks.add(normalizeBlobMask(mask));
  }

  return new Map([...masks].sort((a, b) => a - b).map((mask, index) => [mask, index]));
}

function normalizeBlobMask(mask: number): number {
  const n = Boolean(mask & (1 << 0));
  const e = Boolean(mask & (1 << 2));
  const s = Boolean(mask & (1 << 4));
  const w = Boolean(mask & (1 << 6));
  let normalized = mask;

  if (!(n && e)) {
    normalized &= ~(1 << 1);
  }
  if (!(s && e)) {
    normalized &= ~(1 << 3);
  }
  if (!(s && w)) {
    normalized &= ~(1 << 5);
  }
  if (!(n && w)) {
    normalized &= ~(1 << 7);
  }

  return normalized;
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

function hash01(x: number, y: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;

  return value - Math.floor(value);
}
