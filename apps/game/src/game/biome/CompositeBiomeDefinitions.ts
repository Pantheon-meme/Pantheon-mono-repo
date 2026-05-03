import type {
  BiomeDefinition,
  BiomeObjectDefinition,
  BiomeRegionDefinition,
  BiomeTerrainDefinition,
} from "./BiomeDefinitions";

type BiomeCluster = {
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
};

const pantheonClusters: Record<string, BiomeCluster> = {
  uniswap: { xRatio: 0.19, yRatio: 0.1, widthRatio: 0.58, heightRatio: 0.78 },
  "0g": { xRatio: 0.58, yRatio: 0.06, widthRatio: 0.36, heightRatio: 0.38 },
  gensyn: { xRatio: 0.58, yRatio: 0.56, widthRatio: 0.36, heightRatio: 0.38 },
};

const pantheonBiomeOrder = ["uniswap", "0g", "gensyn"];

export function createPantheonBiome(
  sourceBiomes: Record<string, BiomeDefinition>,
): BiomeDefinition {
  const sponsors = pantheonBiomeOrder
    .map((biomeId) => sourceBiomes[biomeId])
    .filter((biome): biome is BiomeDefinition => Boolean(biome));

  const regions = sponsors.flatMap((biome) =>
    biome.regions.map((region) => remapRegion(biome, region)),
  );
  addPantheonConnection(
    regions,
    "uniswap-swap-city-plain",
    "0g-validator-ridge",
  );
  addPantheonConnection(regions, "uniswap-oracle-swamp", "gensyn-proof-marsh");
  addPantheonConnection(regions, "0g-compute-grove", "gensyn-research-ridge");

  return {
    id: "pantheon",
    label: "Pantheon Protocol Commons",
    subtitle: "Uniswap, 0G, and Gensyn regions woven into one world.",
    description:
      "A shared procedural map where Uniswap liquidity commons meet 0G modular AI infrastructure and Gensyn decentralized compute territories.",
    baseLayer: {
      baseColor: 0x262136,
      variantColor: 0x2f7c83,
      shadowColor: 0x09070f,
    },
    backgroundTerrainId: "uniswap-plain",
    digTerrainId: "uniswap-dirt",
    terrains: sponsors.flatMap((biome) =>
      biome.terrains.map((terrain) => remapTerrain(biome, terrain)),
    ),
    plants: sponsors.flatMap((biome) => biome.plants),
    objects: sponsors.flatMap((biome) =>
      biome.objects.map((object) => remapObject(biome, object)),
    ),
    regions,
    worldGeneration: {
      seed: 9052026,
      spawnClearingRadius: 11,
      treePlantIds: sponsors.flatMap((biome) => biome.worldGeneration.treePlantIds),
    },
  };
}

function addPantheonConnection(
  regions: BiomeRegionDefinition[],
  fromRegionId: string,
  toRegionId: string,
): void {
  const fromRegion = regions.find((region) => region.id === fromRegionId);
  const toRegion = regions.find((region) => region.id === toRegionId);

  if (!fromRegion || !toRegion) {
    return;
  }

  if (!fromRegion.connections.includes(toRegionId)) {
    fromRegion.connections.push(toRegionId);
  }

  if (!toRegion.connections.includes(fromRegionId)) {
    toRegion.connections.push(fromRegionId);
  }
}

function remapTerrain(
  biome: BiomeDefinition,
  terrain: BiomeTerrainDefinition,
): BiomeTerrainDefinition {
  const terrainId = remapTerrainId(biome, terrain.id);

  return {
    ...terrain,
    id: terrainId,
    label: `${biome.label} ${terrain.label}`,
    atlasId: terrain.atlasId,
    texturePrefix: terrain.atlasId,
  };
}

function remapObject(
  biome: BiomeDefinition,
  object: BiomeObjectDefinition,
): BiomeObjectDefinition {
  return {
    ...object,
    placement: {
      ...object.placement,
      regionIds: object.placement.regionIds?.map((regionId) =>
        remapRegionId(biome, regionId),
      ),
      terrainIds: object.placement.terrainIds?.map((terrainId) =>
        remapTerrainId(biome, terrainId),
      ),
    },
  };
}

function remapRegion(
  biome: BiomeDefinition,
  region: BiomeRegionDefinition,
): BiomeRegionDefinition {
  const cluster = pantheonClusters[biome.id];
  const radiusScale = cluster
    ? Math.min(cluster.widthRatio, cluster.heightRatio) * 1.45
    : 1;

  return {
    ...region,
    id: remapRegionId(biome, region.id),
    label: `${biome.label}: ${region.label}`,
    anchor: cluster
      ? {
          xRatio: cluster.xRatio + region.anchor.xRatio * cluster.widthRatio,
          yRatio: cluster.yRatio + region.anchor.yRatio * cluster.heightRatio,
        }
      : region.anchor,
    radiusTiles: Math.max(18, Math.round(region.radiusTiles * radiusScale)),
    terrains: region.terrains.map((terrain) => ({
      ...terrain,
      terrainId: remapTerrainId(biome, terrain.terrainId),
    })),
    plants: region.plants.map((plant) => ({
      ...plant,
      terrainIds: plant.terrainIds?.map((terrainId) =>
        remapTerrainId(biome, terrainId),
      ),
    })),
    objects: region.objects.map((object) => ({
      ...object,
      terrainIds: object.terrainIds?.map((terrainId) =>
        remapTerrainId(biome, terrainId),
      ),
    })),
    connections: region.connections.map((regionId) =>
      remapRegionId(biome, regionId),
    ),
  };
}

function remapTerrainId(biome: BiomeDefinition, terrainId: string): string {
  return `${biome.id}-${terrainId}`;
}

function remapRegionId(biome: BiomeDefinition, regionId: string): string {
  return `${biome.id}-${regionId}`;
}
