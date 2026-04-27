export class ActionProgress {
  actionId?: string;
  label = "";
  elapsedSeconds = 0;
  durationSeconds = 0;

  get active(): boolean {
    return Boolean(this.actionId);
  }

  get ratio(): number {
    if (!this.active || this.durationSeconds <= 0) {
      return 0;
    }

    return Math.min(1, this.elapsedSeconds / this.durationSeconds);
  }

  start(actionId: string, label: string, durationSeconds: number): void {
    this.actionId = actionId;
    this.label = label;
    this.elapsedSeconds = 0;
    this.durationSeconds = Math.max(0, durationSeconds);
  }

  clear(): void {
    this.actionId = undefined;
    this.label = "";
    this.elapsedSeconds = 0;
    this.durationSeconds = 0;
  }
}
