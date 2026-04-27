import { forageActionDefinitions } from "./ForageActions";
import { handActionDefinitions } from "./HandActions";
import { plantActionDefinitions } from "./PlantActions";
import { reflectionActionDefinitions } from "./ReflectionActions";
import { restActionDefinitions } from "./RestActions";
import { terrainActionDefinitions } from "./TerrainActions";
import type { ActionDefinition } from "./ActionTypes";

export type { ActionDefinition, ActionEffectResult } from "./ActionTypes";

export const actionDefinitions: Record<string, ActionDefinition> = {
  ...forageActionDefinitions,
  ...plantActionDefinitions,
  ...handActionDefinitions,
  ...restActionDefinitions,
  ...reflectionActionDefinitions,
  ...terrainActionDefinitions,
};
