export class DiggingCapability {
  constructor(
    public readonly bareHandPower = 1,
    public toolPower = 0,
  ) {}

  get power(): number {
    return Math.max(this.bareHandPower, this.toolPower);
  }
}
