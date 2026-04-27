export class ActionQueue {
  readonly pendingActionIds: string[] = [];

  push(actionId: string): void {
    this.pendingActionIds.push(actionId);
  }

  shift(): string | undefined {
    return this.pendingActionIds.shift();
  }
}
