export class TerrainGrid {
  private readonly filledCells = new Set<string>();
  private revision = 0;

  constructor(
    public readonly width: number,
    public readonly height: number,
    public readonly tileSize: number,
  ) {}

  get version(): number {
    return this.revision;
  }

  get cells(): Iterable<string> {
    return this.filledCells;
  }

  get size(): number {
    return this.filledCells.size;
  }

  has(x: number, y: number): boolean {
    return (
      x >= 0 &&
      y >= 0 &&
      x < this.width &&
      y < this.height &&
      this.filledCells.has(cellKey(x, y))
    );
  }

  set(x: number, y: number, filled: boolean): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      return;
    }

    const key = cellKey(x, y);
    const alreadyFilled = this.filledCells.has(key);

    if (filled && !alreadyFilled) {
      this.filledCells.add(key);
      this.revision += 1;
    }

    if (!filled && alreadyFilled) {
      this.filledCells.delete(key);
      this.revision += 1;
    }
  }

  clear(): void {
    if (this.filledCells.size === 0) {
      return;
    }

    this.filledCells.clear();
    this.revision += 1;
  }
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function parseCellKey(key: string): { x: number; y: number } {
  const [xText, yText] = key.split(",");

  return {
    x: Number.parseInt(xText, 10),
    y: Number.parseInt(yText, 10),
  };
}
