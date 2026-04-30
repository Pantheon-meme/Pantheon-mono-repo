export class Energy {
  private confirmedCurrent: number;
  private confirmedVersion = 0;
  private pendingDelta = 0;

  constructor(
    public current: number,
    public max: number,
    public readonly idleRegenPerSecond: number,
  ) {
    this.confirmedCurrent = current;
  }

  get hasPendingOptimisticDelta(): boolean {
    return this.pendingDelta !== 0;
  }

  setConfirmed(current: number, max: number, version = 0): void {
    if (version > 0 && version < this.confirmedVersion) {
      return;
    }

    this.confirmedVersion = Math.max(this.confirmedVersion, version);
    this.max = max;
    this.confirmedCurrent = this.clamp(current);
    this.refreshCurrent();
  }

  commitLocalDelta(delta: number): void {
    this.confirmedCurrent = this.clamp(this.confirmedCurrent + delta);
    this.refreshCurrent();
  }

  applyOptimisticDelta(delta: number): void {
    this.pendingDelta += delta;
    this.refreshCurrent();
  }

  settleOptimisticDelta(
    delta: number,
    confirmedCurrent: number,
    max: number,
    version = 0,
  ): void {
    this.pendingDelta -= delta;
    this.setConfirmed(confirmedCurrent, max, version);
  }

  settleOptimisticLocally(delta: number): void {
    this.pendingDelta -= delta;
    this.commitLocalDelta(delta);
  }

  rollbackOptimisticDelta(delta: number): void {
    this.pendingDelta -= delta;
    this.refreshCurrent();
  }

  regen(delta: number): void {
    if (delta === 0) {
      return;
    }

    this.commitLocalDelta(delta);
  }

  private refreshCurrent(): void {
    this.current = this.clamp(this.confirmedCurrent + this.pendingDelta);
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(this.max, value));
  }
}
