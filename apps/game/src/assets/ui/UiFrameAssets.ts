import minimapWoodFrameUrl from "./minimap_frame_default.png?url";

export const minimapFrameTextureKey = "ui:minimap-wood-frame";

export const minimapFrameSlices = {
  top: 89,
  right: 81,
  bottom: 104,
  left: 87,
} as const;

export const minimapFrameVisualInset = {
  top: 57,
  right: 50,
  bottom: 57,
  left: 50,
} as const;

export const minimapFrameMapUnderlap = 4;

export const minimapFrameAsset = {
  textureKey: minimapFrameTextureKey,
  imageUrl: minimapWoodFrameUrl,
};
