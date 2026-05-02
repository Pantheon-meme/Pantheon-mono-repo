import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";

export type ActionEffectResult = {
  message?: string;
  applied?: boolean;
  retry?: boolean;
  energySettlement?: "confirmed" | "pending";
};

export type ActionDefinition = {
  id: string;
  label: string;
  energyDelta: number;
  durationSeconds: number;
  canStart?: (world: World, actor: Entity) => ActionEffectResult;
  apply?: (world: World, actor: Entity) => ActionEffectResult;
};
