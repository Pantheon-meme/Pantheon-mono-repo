import { cellKey } from "./TerrainGrid";

export class TerrainDigDepth {
  private readonly depths = new Map<string, number>();
  private revision = 0;

  get version(): number {
    return this.revision;
  }

  get(x: number, y: number): number {
    return this.depths.get(cellKey(x, y)) ?? 0;
  }

  set(x: number, y: number, depth: number): void {
    const key = cellKey(x, y);
    const nextDepth = Math.max(0, Math.floor(depth));
    const currentDepth = this.get(x, y);

    if (currentDepth === nextDepth) {
      return;
    }

    if (nextDepth <= 0) {
      this.depths.delete(key);
    } else {
      this.depths.set(key, nextDepth);
    }

    this.revision += 1;
  }

  increment(x: number, y: number): number {
    const depth = this.get(x, y) + 1;

    this.set(x, y, depth);

    return depth;
  }
}
