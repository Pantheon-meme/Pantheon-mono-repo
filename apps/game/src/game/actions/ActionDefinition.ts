import { forageActionDefinitions } from "./ForageActions";
import { handActionDefinitions } from "./HandActions";
import { plantActionDefinitions } from "./PlantActions";
import { reflectionActionDefinitions } from "./ReflectionActions";
import { sleepActionDefinitions } from "./SleepActions";
import { terrainActionDefinitions } from "./TerrainActions";
import type { ActionDefinition } from "./ActionTypes";

export type { ActionDefinition, ActionEffectResult } from "./ActionTypes";

export const actionDefinitions: Record<string, ActionDefinition> = {
  ...forageActionDefinitions,
  ...plantActionDefinitions,
  ...handActionDefinitions,
  ...sleepActionDefinitions,
  ...reflectionActionDefinitions,
  ...terrainActionDefinitions,
};
