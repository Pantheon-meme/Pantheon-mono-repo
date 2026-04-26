export class Energy {
  constructor(
    public current: number,
    public readonly max: number,
    public readonly moveDrainPerSecond: number,
    public readonly idleRegenPerSecond: number,
  ) {}
}
