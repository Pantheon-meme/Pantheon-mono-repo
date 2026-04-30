export class Energy {
  constructor(
    public current: number,
    public max: number,
    public readonly idleRegenPerSecond: number,
  ) {}
}
