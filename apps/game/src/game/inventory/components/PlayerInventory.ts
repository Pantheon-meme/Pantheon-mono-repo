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

    if (this.activeSlot >= Math.max(1, Math.ceil(this.maxWeight))) {
      this.activeSlot = 0;
    }
  }

  sortedSlots(): InventoryObjectSlot[] {
    return [...this.slots.values()].sort((a, b) => a.slot - b.slot);
  }

  selectSlot(slot: number): void {
    if (slot < 0 || slot >= Math.ceil(this.maxWeight)) {
      return;
    }

    this.activeSlot = slot;
  }

  selectNext(direction: -1 | 1): void {
    const slotCount = Math.max(1, Math.ceil(this.maxWeight));
    this.activeSlot = (this.activeSlot + direction + slotCount) % slotCount;
  }
}
