export class ActionQueue {
  readonly pendingActionIds: string[] = [];

  push(actionId: string): void {
    this.pendingActionIds.push(actionId);
  }

  unshift(actionId: string): void {
    this.pendingActionIds.unshift(actionId);
  }

  peek(): string | undefined {
    return this.pendingActionIds[0];
  }

  shift(): string | undefined {
    return this.pendingActionIds.shift();
  }
}
