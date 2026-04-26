export class SeedPouch {
  activeSeedId = "sungrain_seed";
  readonly seeds = new Map<string, number>();

  add(seedId: string, amount: number): void {
    this.seeds.set(seedId, this.count(seedId) + amount);

    if (this.count(this.activeSeedId) <= 0) {
      this.activeSeedId = seedId;
    }
  }

  count(seedId: string): number {
    return this.seeds.get(seedId) ?? 0;
  }

  consume(seedId: string, amount: number): boolean {
    const current = this.count(seedId);

    if (current < amount) {
      return false;
    }

    this.seeds.set(seedId, current - amount);

    return true;
  }

  cycle(): void {
    const availableSeeds = [...this.seeds.entries()]
      .filter(([, count]) => count > 0)
      .map(([seedId]) => seedId);

    if (availableSeeds.length === 0) {
      return;
    }

    const currentIndex = availableSeeds.indexOf(this.activeSeedId);
    const nextIndex = (currentIndex + 1) % availableSeeds.length;

    this.activeSeedId = availableSeeds[nextIndex] ?? availableSeeds[0];
  }
}
