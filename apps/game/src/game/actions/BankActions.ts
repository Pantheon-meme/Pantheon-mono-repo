import type { Entity } from "../../ecs/World";
import type { World } from "../../ecs/World";
import { FocusTarget } from "../player/components/FocusTarget";
import { BankPanel } from "../ui/components/BankPanel";
import type { ActionDefinition, ActionEffectResult } from "./ActionTypes";

const centralBankObjectLabel = "Central Uni Bank";

export const bankActionDefinitions: Record<string, ActionDefinition> = {
  "bank-open": {
    id: "bank-open",
    label: "Bank",
    energyDelta: 0,
    durationSeconds: 0,
    canStart: canOpenBank,
    apply: openBank,
  },
};

function canOpenBank(world: World, actor: Entity): ActionEffectResult {
  const focus = world.getComponent(actor, FocusTarget);

  if (
    focus?.kind !== "object" ||
    focus.objectLabel !== centralBankObjectLabel
  ) {
    return { message: "Bank: face the Central Uni Bank", applied: false };
  }

  if (!world.query(BankPanel)[0]?.[1]) {
    return { message: "Bank: panel unavailable", applied: false };
  }

  return {};
}

function openBank(world: World, actor: Entity): ActionEffectResult {
  const startResult = canOpenBank(world, actor);

  if (startResult.applied === false) {
    return startResult;
  }

  const panel = world.query(BankPanel)[0]?.[1];

  if (!panel) {
    return { message: "Bank: panel unavailable", applied: false };
  }

  panel.visible = true;
  panel.activeTab = "sell";
  panel.message = "Opening Central Uni Bank...";
  panel.signature = "";

  return { message: "Central Uni Bank opened" };
}
