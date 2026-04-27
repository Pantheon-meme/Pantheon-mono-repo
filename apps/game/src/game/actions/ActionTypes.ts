import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";

export type ActionEffectResult = {
  message?: string;
  applied?: boolean;
};

export type ActionDefinition = {
  id: string;
  label: string;
  energyDelta: number;
  apply?: (world: World, actor: Entity) => ActionEffectResult;
};
