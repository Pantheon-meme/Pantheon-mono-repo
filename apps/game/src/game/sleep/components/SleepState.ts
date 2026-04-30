export class SleepState {
  active = false;
  elapsedSeconds = 0;
  durationSeconds = 0;
  energyPerSecond = 0;
  pendingEnergy = 0;
  terrainLayerId = "vibrant-grass";
  onchainStarted = false;

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
    this.onchainStarted = false;
  }

  confirmOnchainStart(energyGain: number): void {
    this.onchainStarted = true;
    this.elapsedSeconds = 0;
    this.pendingEnergy = 0;
    this.energyPerSecond = energyGain / this.durationSeconds;
  }

  finish(): number {
    const energyGain = Math.floor(this.pendingEnergy);

    this.active = false;
    this.elapsedSeconds = 0;
    this.durationSeconds = 0;
    this.energyPerSecond = 0;
    this.pendingEnergy = 0;
    this.onchainStarted = false;

    return energyGain;
  }
}
