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
  emberwheat: {
    id: "emberwheat",
    seedId: "emberwheat_seed",
    seedLabel: "Emberwheat seed",
    label: "Emberwheat",
    growthSeconds: 30,
    colors: {
      seed: 0xc66a32,
      growing: 0x83a84a,
      grown: 0xf08a3e,
      fetched: 0x8b4f36,
    },
  },
  frostbarley: {
    id: "frostbarley",
    seedId: "frostbarley_seed",
    seedLabel: "Frostbarley seed",
    label: "Frostbarley",
    growthSeconds: 34,
    colors: {
      seed: 0xcfe8f5,
      growing: 0x9ecfb7,
      grown: 0xe8f6ff,
      fetched: 0x8aa9b2,
    },
  },
  duskmillet: {
    id: "duskmillet",
    seedId: "duskmillet_seed",
    seedLabel: "Duskmillet seed",
    label: "Duskmillet",
    growthSeconds: 28,
    colors: {
      seed: 0x8b6fba,
      growing: 0x6f9b6a,
      grown: 0xb895d6,
      fetched: 0x5e536f,
    },
  },
  starrye: {
    id: "starrye",
    seedId: "starrye_seed",
    seedLabel: "Starrye seed",
    label: "Starrye",
    growthSeconds: 38,
    colors: {
      seed: 0xf2df8a,
      growing: 0x7fbf8f,
      grown: 0xfff0a8,
      fetched: 0x9a875a,
    },
  },
  silveroat: {
    id: "silveroat",
    seedId: "silveroat_seed",
    seedLabel: "Silveroat seed",
    label: "Silveroat",
    growthSeconds: 32,
    colors: {
      seed: 0xbfc7c8,
      growing: 0x8fbf8d,
      grown: 0xd8ded7,
      fetched: 0x7d8582,
    },
  },
};

export function getPlantBySeed(seedId: string): PlantDefinition | undefined {
  return Object.values(plantDefinitions).find(
    (definition) => definition.seedId === seedId,
  );
}
