export type ActionProgressFinalStatus = "success" | "failure";

export class ActionProgress {
  actionId?: string;
  label = "";
  elapsedSeconds = 0;
  durationSeconds = 0;
  finalStatus?: ActionProgressFinalStatus;
  finalActionId?: string;
  finalLabel = "";

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
    this.clearFinalStatus();
    this.actionId = actionId;
    this.label = label;
    this.elapsedSeconds = 0;
    this.durationSeconds = Math.max(0, durationSeconds);
  }

  finish(status: ActionProgressFinalStatus): void {
    this.finalStatus = status;
    this.finalActionId = this.actionId;
    this.finalLabel = this.label;
    this.actionId = undefined;
    this.label = "";
    this.elapsedSeconds = 0;
    this.durationSeconds = 0;
  }

  clear(): void {
    this.actionId = undefined;
    this.label = "";
    this.elapsedSeconds = 0;
    this.durationSeconds = 0;
    this.clearFinalStatus();
  }

  clearFinalStatus(): void {
    this.finalStatus = undefined;
    this.finalActionId = undefined;
    this.finalLabel = "";
  }
}
