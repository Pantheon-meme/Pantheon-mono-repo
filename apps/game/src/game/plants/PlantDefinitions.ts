export type PlantDefinition = {
  id: string;
  seedId: string;
  seedLabel: string;
  label: string;
  growthSeconds: number;
  colors: {
    seed: number;
    growing: number;
    grown: number;
    fetched: number;
  };
};

export const plantDefinitions: Record<string, PlantDefinition> = {
  sungrain: {
    id: "sungrain",
    seedId: "sungrain_seed",
    seedLabel: "Sungrain seed",
    label: "Sungrain",
    growthSeconds: 24,
    colors: {
      seed: 0xd8a541,
      growing: 0x7dbd47,
      grown: 0xf0c85a,
      fetched: 0x8b7350,
    },
  },
  moonroot: {
    id: "moonroot",
    seedId: "moonroot_seed",
    seedLabel: "Moonroot seed",
    label: "Moonroot",
    growthSeconds: 36,
    colors: {
      seed: 0xb7c5ff,
      growing: 0x87c6d8,
      grown: 0xd9e2ff,
      fetched: 0x6f778f,
    },
  },
};

export function getPlantBySeed(seedId: string): PlantDefinition | undefined {
  return Object.values(plantDefinitions).find(
    (definition) => definition.seedId === seedId,
  );
}
