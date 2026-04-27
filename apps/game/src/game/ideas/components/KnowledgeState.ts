export class KnowledgeState {
  readonly knownItems = new Set<string>();

  constructor(initialKnownItems: string[] = []) {
    for (const item of initialKnownItems) {
      this.knownItems.add(item);
    }
  }

  knowsAll(items: string[]): boolean {
    return items.every((item) => this.knownItems.has(item));
  }
}
