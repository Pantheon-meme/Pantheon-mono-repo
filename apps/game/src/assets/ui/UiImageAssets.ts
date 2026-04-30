import joystickControlUrl from "./joystick_control.png?url";
import joystickPlainUrl from "./joystick_plain.png?url";
import playerMarkerUrl from "./player_marker.png?url";

export const playerMarkerTextureKey = "ui:player-marker";
export const joystickPlainTextureKey = "ui:joystick-plain";
export const joystickControlTextureKey = "ui:joystick-control";

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
  playerMarkerAsset,
  joystickPlainAsset,
  joystickControlAsset,
] as const;
