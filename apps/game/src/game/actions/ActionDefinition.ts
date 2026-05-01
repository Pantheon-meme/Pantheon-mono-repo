import { bankActionDefinitions } from "./BankActions";
import { forageActionDefinitions } from "./ForageActions";
import { handActionDefinitions } from "./HandActions";
import { inventoryActionDefinitions } from "./InventoryActions";
import { plantActionDefinitions } from "./PlantActions";
import { reflectionActionDefinitions } from "./ReflectionActions";
import { sleepActionDefinitions } from "./SleepActions";
import { terrainActionDefinitions } from "./TerrainActions";
import type { ActionDefinition } from "./ActionTypes";

export type { ActionDefinition, ActionEffectResult } from "./ActionTypes";

export const actionDefinitions: Record<string, ActionDefinition> = {
  ...bankActionDefinitions,
  ...forageActionDefinitions,
  ...plantActionDefinitions,
  ...inventoryActionDefinitions,
  ...handActionDefinitions,
  ...sleepActionDefinitions,
  ...reflectionActionDefinitions,
  ...terrainActionDefinitions,
};
