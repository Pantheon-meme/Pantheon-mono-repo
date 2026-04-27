import type { CheckResult } from "../../rules/CheckResolver";

export type IdeaProgress = {
  id: string;
  progress: number;
  unlocked: boolean;
};

export class IdeaState {
  readonly ideas = new Map<string, IdeaProgress>();
  lastCheck?: CheckResult;

  getOrCreate(id: string): IdeaProgress {
    let idea = this.ideas.get(id);

    if (!idea) {
      idea = { id, progress: 0, unlocked: false };
      this.ideas.set(id, idea);
    }

    return idea;
  }
}
