export class SkillSet {
  private readonly skills = new Map<string, number>();

  constructor(initialSkills: Record<string, number> = {}) {
    for (const [id, value] of Object.entries(initialSkills)) {
      this.skills.set(id, value);
    }
  }

  get(id: string): number {
    return this.skills.get(id) ?? 0;
  }

  addExperience(id: string, amount: number): void {
    this.skills.set(id, this.get(id) + amount);
  }

  entries(): Array<[string, number]> {
    return [...this.skills.entries()].sort(([a], [b]) => a.localeCompare(b));
  }
}
