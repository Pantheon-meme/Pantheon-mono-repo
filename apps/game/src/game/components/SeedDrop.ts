export class SeedDrop {
  collected = false;

  constructor(
    public readonly seedId: string,
    public readonly amount: number,
  ) {}
}
