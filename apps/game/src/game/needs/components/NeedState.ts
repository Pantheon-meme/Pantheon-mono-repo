export type NeedEntry = {
  id: string;
  label: string;
  description: string;
  urgency: number;
  active: boolean;
};

export class NeedState {
  readonly needs = new Map<string, NeedEntry>();

  addNeed(need: NeedEntry): void {
    const existing = this.needs.get(need.id);

    if (existing) {
      existing.urgency = Math.max(existing.urgency, need.urgency);
      existing.active = existing.active || need.active;
      return;
    }

    this.needs.set(need.id, { ...need });
  }

  get activeNeeds(): NeedEntry[] {
    return [...this.needs.values()]
      .filter((need) => need.active)
      .sort((a, b) => b.urgency - a.urgency);
  }
}
