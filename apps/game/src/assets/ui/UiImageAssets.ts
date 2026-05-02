import actionButtonBgUrl from "./actionButton_bg.png?url";
import actionButtonKeyboardShortcutKeyUrl from "./actionButton_keyboardShortcutKey.png?url";
import energyBarBarUrl from "./energybar_bar.png?url";
import energyBarFillerUrl from "./energybar_filler.png?url";
import energyBarIconUrl from "./energybar_icon.png?url";
import inventoryDividerUrl from "./inventory_divider.png?url";
import inventoryPanelUrl from "./inventory_panel.png?url";
import inventorySlotHoverUrl from "./inventory_slot_hover.png?url";
import inventorySlotSelectedUrl from "./inventory_slot_selected.png?url";
import inventorySlotUrl from "./inventory_slot.png?url";
import joystickControlUrl from "./joystick_control.png?url";
import joystickPlainUrl from "./joystick_plain.png?url";
import playerMarkerUrl from "./player_marker.png?url";
import iconAxeUrl from "./Icons/axe.png?url";
import iconDigUrl from "./Icons/dig.png?url";
import iconDiggingToolUrl from "./Icons/diggin_tool.png?url";
import iconDropUrl from "./Icons/drop.png?url";
import iconErrorFailUrl from "./Icons/error_fail.png?url";
import iconForageUrl from "./Icons/forage.png?url";
import iconGatherUrl from "./Icons/gather.png?url";
import iconGrabUrl from "./Icons/grab.png?url";
import iconHandsUrl from "./Icons/hands.png?url";
import iconHarvestUrl from "./Icons/harvest.png?url";
import iconJournalUrl from "./Icons/journal.png?url";
import iconMapUrl from "./Icons/map.png?url";
import iconPendingUrl from "./Icons/pending.png?url";
import iconPlantUrl from "./Icons/plant.png?url";
import iconSettingsUrl from "./Icons/settings.png?url";
import iconSleepUrl from "./Icons/sleep.png?url";
import iconSleepPillowUrl from "./Icons/sleep_pillow.png?url";
import iconSuccessUrl from "./Icons/success.png?url";
import iconWateringCanUrl from "./Icons/watering_can.png?url";

export const actionButtonBgTextureKey = "ui:action-button-bg";
export const actionButtonKeyboardShortcutKeyTextureKey =
  "ui:action-button-keyboard-shortcut-key";
export const energyBarBarTextureKey = "ui:energybar-bar";
export const energyBarFillerTextureKey = "ui:energybar-filler";
export const energyBarIconTextureKey = "ui:energybar-icon";
export const inventoryDividerTextureKey = "ui:inventory-divider";
export const inventoryPanelTextureKey = "ui:inventory-panel";
export const inventorySlotTextureKey = "ui:inventory-slot";
export const inventorySlotHoverTextureKey = "ui:inventory-slot-hover";
export const inventorySlotSelectedTextureKey = "ui:inventory-slot-selected";
export const playerMarkerTextureKey = "ui:player-marker";
export const joystickPlainTextureKey = "ui:joystick-plain";
export const joystickControlTextureKey = "ui:joystick-control";

const uiIconSize = 188;

function iconAsset(textureKey: string, imageUrl: string) {
  return {
    textureKey,
    imageUrl,
    width: uiIconSize,
    height: uiIconSize,
  } as const;
}

export const uiIconAssets = {
  axe: iconAsset("ui:icon-axe", iconAxeUrl),
  dig: iconAsset("ui:icon-dig", iconDigUrl),
  diggingTool: iconAsset("ui:icon-digging-tool", iconDiggingToolUrl),
  drop: iconAsset("ui:icon-drop", iconDropUrl),
  errorFail: iconAsset("ui:icon-error-fail", iconErrorFailUrl),
  forage: iconAsset("ui:icon-forage", iconForageUrl),
  gather: iconAsset("ui:icon-gather", iconGatherUrl),
  grab: iconAsset("ui:icon-grab", iconGrabUrl),
  hands: iconAsset("ui:icon-hands", iconHandsUrl),
  harvest: iconAsset("ui:icon-harvest", iconHarvestUrl),
  journal: iconAsset("ui:icon-journal", iconJournalUrl),
  map: iconAsset("ui:icon-map", iconMapUrl),
  pending: iconAsset("ui:icon-pending", iconPendingUrl),
  plant: iconAsset("ui:icon-plant", iconPlantUrl),
  settings: iconAsset("ui:icon-settings", iconSettingsUrl),
  sleep: iconAsset("ui:icon-sleep", iconSleepUrl),
  sleepPillow: iconAsset("ui:icon-sleep-pillow", iconSleepPillowUrl),
  success: iconAsset("ui:icon-success", iconSuccessUrl),
  wateringCan: iconAsset("ui:icon-watering-can", iconWateringCanUrl),
} as const;

export type UiIconAsset = (typeof uiIconAssets)[keyof typeof uiIconAssets];

export const actionButtonBgSlices = {
  top: 37,
  right: 41,
  bottom: 37,
  left: 36,
} as const;

export const energyBarFillerSlices = {
  left: 36,
  right: 37,
} as const;

export const inventoryPanelSlices = {
  top: 18,
  right: 136,
  bottom: 20,
  left: 135,
} as const;

export const actionButtonBgAsset = {
  textureKey: actionButtonBgTextureKey,
  imageUrl: actionButtonBgUrl,
  width: 450,
  height: 156,
} as const;

export const actionButtonKeyboardShortcutKeyAsset = {
  textureKey: actionButtonKeyboardShortcutKeyTextureKey,
  imageUrl: actionButtonKeyboardShortcutKeyUrl,
  width: 48,
  height: 50,
} as const;

export const energyBarBarAsset = {
  textureKey: energyBarBarTextureKey,
  imageUrl: energyBarBarUrl,
  width: 368,
  height: 71,
} as const;

export const energyBarFillerAsset = {
  textureKey: energyBarFillerTextureKey,
  imageUrl: energyBarFillerUrl,
  width: 368,
  height: 71,
} as const;

export const energyBarIconAsset = {
  textureKey: energyBarIconTextureKey,
  imageUrl: energyBarIconUrl,
  width: 96,
  height: 97,
} as const;

export const inventoryPanelAsset = {
  textureKey: inventoryPanelTextureKey,
  imageUrl: inventoryPanelUrl,
  width: 798,
  height: 147,
} as const;

export const inventoryDividerAsset = {
  textureKey: inventoryDividerTextureKey,
  imageUrl: inventoryDividerUrl,
  width: 35,
  height: 126,
} as const;

export const inventorySlotAsset = {
  textureKey: inventorySlotTextureKey,
  imageUrl: inventorySlotUrl,
  width: 114,
  height: 115,
} as const;

export const inventorySlotHoverAsset = {
  textureKey: inventorySlotHoverTextureKey,
  imageUrl: inventorySlotHoverUrl,
  width: 114,
  height: 115,
} as const;

export const inventorySlotSelectedAsset = {
  textureKey: inventorySlotSelectedTextureKey,
  imageUrl: inventorySlotSelectedUrl,
  width: 130,
  height: 129,
} as const;

export const playerMarkerAsset = {
  textureKey: playerMarkerTextureKey,
  imageUrl: playerMarkerUrl,
  width: 54,
  height: 53,
} as const;

export const joystickPlainAsset = {
  textureKey: joystickPlainTextureKey,
  imageUrl: joystickPlainUrl,
  width: 188,
  height: 182,
} as const;

export const joystickControlAsset = {
  textureKey: joystickControlTextureKey,
  imageUrl: joystickControlUrl,
  width: 188,
  height: 182,
} as const;

export const uiImageAssets = [
  actionButtonBgAsset,
  actionButtonKeyboardShortcutKeyAsset,
  energyBarBarAsset,
  energyBarFillerAsset,
  energyBarIconAsset,
  inventoryPanelAsset,
  inventoryDividerAsset,
  inventorySlotAsset,
  inventorySlotHoverAsset,
  inventorySlotSelectedAsset,
  playerMarkerAsset,
  joystickPlainAsset,
  joystickControlAsset,
  ...Object.values(uiIconAssets),
] as const;
