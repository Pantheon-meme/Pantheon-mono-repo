export type InventoryObjectSlot = {
  slot: number;
  objectId: string;
  objectTypeId: string;
  itemId: string;
  amount: number;
  weight: number;
  label?: string;
  syncState?: "pending" | "confirmed" | "rejected";
};

export class PlayerInventory {
  readonly slots = new Map<number, InventoryObjectSlot>();
  activeSlot = 0;
  readonly maxSlots = 256;

  constructor(public maxWeight = 2) {}

  get usedWeight(): number {
    return [...this.slots.values()].reduce(
      (total, slot) => total + slot.weight,
      0,
    );
  }

  replaceSlots(slots: InventoryObjectSlot[], maxWeight = this.maxWeight): void {
    this.maxWeight = maxWeight;
    this.slots.clear();

    for (const slot of slots) {
      this.slots.set(slot.slot, slot);
    }

    if (this.slots.size > 0 && !this.slots.has(this.activeSlot)) {
      this.activeSlot = this.sortedSlots()[0]?.slot ?? 0;
    }
  }

  sortedSlots(): InventoryObjectSlot[] {
    return [...this.slots.values()].sort((a, b) => a.slot - b.slot);
  }

  selectSlot(slot: number): void {
    if (slot < 0 || slot >= this.maxSlots) {
      return;
    }

    this.activeSlot = slot;
  }

  selectNext(direction: -1 | 1): void {
    const occupiedSlots = this.sortedSlots().map((slot) => slot.slot);

    if (occupiedSlots.length === 0) {
      this.activeSlot = 0;
      return;
    }

    const currentIndex = occupiedSlots.indexOf(this.activeSlot);
    const nextIndex =
      currentIndex === -1
        ? 0
        : (currentIndex + direction + occupiedSlots.length) %
          occupiedSlots.length;

    this.activeSlot = occupiedSlots[nextIndex];
  }

  nextFreeSlot(): number | undefined {
    for (let slot = 0; slot < this.maxSlots; slot += 1) {
      if (!this.slots.has(slot)) {
        return slot;
      }
    }

    return undefined;
  }
}
