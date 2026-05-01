import energyBarBarUrl from "./energybar_bar.png?url";
import energyBarFillerUrl from "./energybar_filler.png?url";
import energyBarIconUrl from "./energybar_icon.png?url";
import joystickControlUrl from "./joystick_control.png?url";
import joystickPlainUrl from "./joystick_plain.png?url";
import playerMarkerUrl from "./player_marker.png?url";

export const energyBarBarTextureKey = "ui:energybar-bar";
export const energyBarFillerTextureKey = "ui:energybar-filler";
export const energyBarIconTextureKey = "ui:energybar-icon";
export const playerMarkerTextureKey = "ui:player-marker";
export const joystickPlainTextureKey = "ui:joystick-plain";
export const joystickControlTextureKey = "ui:joystick-control";

export const energyBarFillerSlices = {
  left: 36,
  right: 37,
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
  energyBarBarAsset,
  energyBarFillerAsset,
  energyBarIconAsset,
  playerMarkerAsset,
  joystickPlainAsset,
  joystickControlAsset,
] as const;
