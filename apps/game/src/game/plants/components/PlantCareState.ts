export type PlantCareSyncState = "local" | "pending" | "confirmed" | "rejected";

export class PlantCareState {
  moisture = 45;
  fertility = 55;
  health = 100;
  stress = 0;
  syncState: PlantCareSyncState = "local";
  lastAction?: "plant" | "water" | "tend" | "harvest";

  snapshot(): PlantCareSnapshot {
    return {
      moisture: this.moisture,
      fertility: this.fertility,
      health: this.health,
      stress: this.stress,
      syncState: this.syncState,
      lastAction: this.lastAction,
    };
  }

  restore(snapshot: PlantCareSnapshot): void {
    this.moisture = snapshot.moisture;
    this.fertility = snapshot.fertility;
    this.health = snapshot.health;
    this.stress = snapshot.stress;
    this.syncState = snapshot.syncState;
    this.lastAction = snapshot.lastAction;
  }

  recalculate(): void {
    const moistureStress =
      this.moisture < 35
        ? 35 - this.moisture
        : this.moisture > 78
          ? this.moisture - 78
          : 0;
    const fertilityStress = this.fertility < 42 ? 42 - this.fertility : 0;

    this.stress = clampCare(moistureStress + fertilityStress);
    this.health = 100 - this.stress;
  }
}

export type PlantCareSnapshot = {
  moisture: number;
  fertility: number;
  health: number;
  stress: number;
  syncState: PlantCareSyncState;
  lastAction?: "plant" | "water" | "tend" | "harvest";
};

export function clampCare(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
