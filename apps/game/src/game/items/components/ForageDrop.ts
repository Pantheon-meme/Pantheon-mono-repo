export class ForageDrop {
  collected = false;

  constructor(
    public readonly itemId: string,
    public readonly amount: number,
    public pending = false,
  ) {}
}
