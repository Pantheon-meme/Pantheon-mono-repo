export class SleepState {
  active = false;
  elapsedSeconds = 0;
  durationSeconds = 0;
  energyPerSecond = 0;
  pendingEnergy = 0;
  terrainLayerId = "vibrant-grass";

  start(
    durationSeconds: number,
    energyPerSecond: number,
    terrainLayerId: string,
  ): void {
    this.active = true;
    this.elapsedSeconds = 0;
    this.durationSeconds = durationSeconds;
    this.energyPerSecond = energyPerSecond;
    this.pendingEnergy = 0;
    this.terrainLayerId = terrainLayerId;
  }

  finish(): number {
    const energyGain = Math.floor(this.pendingEnergy);

    this.active = false;
    this.elapsedSeconds = 0;
    this.durationSeconds = 0;
    this.energyPerSecond = 0;
    this.pendingEnergy = 0;

    return energyGain;
  }
}
