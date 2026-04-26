export type IdeaDefinition = {
  id: string;
  needId: string;
  label: string;
  description: string;
  difficulty: number;
  progressRequired: number;
  skillId: string;
  requiredKnownItems: string[];
};

export const ideaDefinitions: Record<string, IdeaDefinition> = {
  fiber_pouch: {
    id: "fiber_pouch",
    needId: "carry_more",
    label: "Fiber pouch",
    description: "A small tied pouch for seeds, fibers, and other light finds.",
    difficulty: 8,
    progressRequired: 18,
    skillId: "reflection",
    requiredKnownItems: ["fiber"],
  },
  woven_backpack: {
    id: "woven_backpack",
    needId: "carry_more",
    label: "Woven backpack",
    description: "A shoulder-carried container that can hold more weight.",
    difficulty: 12,
    progressRequired: 42,
    skillId: "reflection",
    requiredKnownItems: ["fiber", "stick"],
  },
};

export function getIdeasForNeed(needId: string): IdeaDefinition[] {
  return Object.values(ideaDefinitions).filter(
    (definition) => definition.needId === needId,
  );
}
