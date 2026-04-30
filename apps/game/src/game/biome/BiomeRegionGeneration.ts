import type { TerrainGrid } from "../terrain/components/TerrainGrid";
import type { BiomeDefinition, BiomeRegionDefinition } from "./BiomeDefinitions";

export type BiomeRegionAnchor = {
  definition: BiomeRegionDefinition;
  tileX: number;
  tileY: number;
};

export type BiomeConnection = {
  from: BiomeRegionAnchor;
  to: BiomeRegionAnchor;
};

export type BiomeRegionPlan = {
  anchors: BiomeRegionAnchor[];
  connections: BiomeConnection[];
};

export function createBiomeRegionPlan(
  grid: TerrainGrid,
  biome: BiomeDefinition,
): BiomeRegionPlan {
  const anchors = biome.regions.map((definition) => ({
    definition,
    tileX: clampTile(Math.round(definition.anchor.xRatio * (grid.width - 1)), grid.width),
    tileY: clampTile(Math.round(definition.anchor.yRatio * (grid.height - 1)), grid.height),
  }));
  const anchorById = new Map(
    anchors.map((anchor) => [anchor.definition.id, anchor]),
  );
  const connectionKeys = new Set<string>();
  const connections: BiomeConnection[] = [];

  for (const anchor of anchors) {
    for (const connectedRegionId of anchor.definition.connections) {
      const connectedAnchor = anchorById.get(connectedRegionId);

      if (!connectedAnchor) {
        continue;
      }

      const key = [anchor.definition.id, connectedRegionId].sort().join("->");

      if (connectionKeys.has(key)) {
        continue;
      }

      connectionKeys.add(key);
      connections.push({ from: anchor, to: connectedAnchor });
    }
  }

  return { anchors, connections };
}

export function getDominantRegion(
  plan: BiomeRegionPlan,
  tileX: number,
  tileY: number,
): BiomeRegionAnchor | undefined {
  let bestAnchor: BiomeRegionAnchor | undefined;
  let bestInfluence = 0;

  for (const anchor of plan.anchors) {
    const influence = getRegionInfluence(anchor, tileX, tileY);

    if (influence > bestInfluence) {
      bestAnchor = anchor;
      bestInfluence = influence;
    }
  }

  return bestAnchor;
}

export function getRegionInfluence(
  anchor: BiomeRegionAnchor,
  tileX: number,
  tileY: number,
): number {
  const distance = tileDistance(tileX, tileY, anchor.tileX, anchor.tileY);
  const normalizedDistance = distance / Math.max(1, anchor.definition.radiusTiles);

  if (normalizedDistance >= 1.35) {
    return 0;
  }

  return Math.max(0, 1 - normalizedDistance);
}

export function getTerrainRegionScore(
  plan: BiomeRegionPlan,
  terrainId: string,
  tileX: number,
  tileY: number,
): number {
  let score = 0;

  for (const anchor of plan.anchors) {
    const terrainWeight =
      anchor.definition.terrains.find((terrain) => terrain.terrainId === terrainId)
        ?.weight ?? 0;

    if (terrainWeight <= 0) {
      continue;
    }

    score = Math.max(
      score,
      terrainWeight * getRegionInfluence(anchor, tileX, tileY),
    );
  }

  return Math.max(score, getConnectionTerrainScore(plan, terrainId, tileX, tileY));
}

export function getConnectionTerrainScore(
  plan: BiomeRegionPlan,
  terrainId: string,
  tileX: number,
  tileY: number,
): number {
  if (
    terrainId !== "route-silk" &&
    terrainId !== "governance-stone" &&
    terrainId !== "path" &&
    terrainId !== "stone"
  ) {
    return 0;
  }

  let score = 0;

  for (const connection of plan.connections) {
    const distance = distanceToSegment(
      tileX,
      tileY,
      connection.from.tileX,
      connection.from.tileY,
      connection.to.tileX,
      connection.to.tileY,
    );

    if (distance > 2.2) {
      continue;
    }

    const routeScore =
      terrainId === "route-silk" || terrainId === "path" ? 0.9 : 0.22;

    score = Math.max(score, routeScore * (1 - distance / 2.2));
  }

  return score;
}

export function getObjectRegionScore(
  plan: BiomeRegionPlan,
  objectId: string,
  tileX: number,
  tileY: number,
  allowedRegionIds?: string[],
): number {
  let score = 0;
  const allowedRegions = allowedRegionIds ? new Set(allowedRegionIds) : undefined;

  for (const anchor of plan.anchors) {
    if (allowedRegions && !allowedRegions.has(anchor.definition.id)) {
      continue;
    }

    const objectWeight =
      anchor.definition.objects.find((object) => object.objectId === objectId)
        ?.weight ?? 0;

    if (objectWeight <= 0) {
      continue;
    }

    score = Math.max(score, objectWeight * getRegionInfluence(anchor, tileX, tileY));
  }

  return score;
}

export function isNearRegionConnection(
  plan: BiomeRegionPlan,
  tileX: number,
  tileY: number,
  maxDistance: number,
): boolean {
  return plan.connections.some(
    (connection) =>
      distanceToSegment(
        tileX,
        tileY,
        connection.from.tileX,
        connection.from.tileY,
        connection.to.tileX,
        connection.to.tileY,
      ) <= maxDistance,
  );
}

export function tileDistance(
  x: number,
  y: number,
  targetX: number,
  targetY: number,
): number {
  const dx = x - targetX;
  const dy = y - targetY;

  return Math.sqrt(dx * dx + dy * dy);
}

function distanceToSegment(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return tileDistance(x, y, x1, y1);
  }

  const amount = Math.max(
    0,
    Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared),
  );
  const projectedX = x1 + amount * dx;
  const projectedY = y1 + amount * dy;

  return tileDistance(x, y, projectedX, projectedY);
}

function clampTile(value: number, max: number): number {
  return Math.max(1, Math.min(max - 2, value));
}
