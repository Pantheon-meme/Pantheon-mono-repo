export type OnchainPresentationPose = "action" | "sleep";

export class OnchainPresentation {
  pose?: OnchainPresentationPose;
  elapsedSeconds = 0;
  durationSeconds = 0;

  get active(): boolean {
    return Boolean(this.pose);
  }

  start(pose: OnchainPresentationPose, durationSeconds: number): void {
    this.pose = pose;
    this.elapsedSeconds = 0;
    this.durationSeconds = Math.max(0.1, durationSeconds);
  }

  clear(): void {
    this.pose = undefined;
    this.elapsedSeconds = 0;
    this.durationSeconds = 0;
  }
}
