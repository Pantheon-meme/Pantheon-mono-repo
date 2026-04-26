export type ActionDefinition = {
  id: string;
  label: string;
  energyDelta: number;
};

export const actionDefinitions: Record<string, ActionDefinition> = {
  gather: {
    id: "gather",
    label: "Gather",
    energyDelta: -18,
  },
  rest: {
    id: "rest",
    label: "Rest",
    energyDelta: 24,
  },
  inspect: {
    id: "inspect",
    label: "Inspect",
    energyDelta: 0,
  },
};
