export const blobAtlasCellSize = 256;

export const blob7x7MaskLayout = [
  [11, 31, 22, 2, 254, 251, 123],
  [107, 255, 214, 66, 223, 127, 95],
  [104, 248, 208, 64, 94, 122, 222],
  [8, 24, 16, 0, 218, 91, 250],
  [106, 210, 30, 27, 10, 26, 18],
  [75, 86, 216, 120, 74, 90, 82],
  [0, 0, 219, 126, 72, 88, 80],
] as const;

export type BlobAtlasSlot = {
  column: number;
  row: number;
};

export function buildBlobAtlasSlotLookup(): Map<number, BlobAtlasSlot> {
  const slots = new Map<number, BlobAtlasSlot>();

  blob7x7MaskLayout.forEach((rowMasks, row) => {
    rowMasks.forEach((mask, column) => {
      if (!slots.has(mask)) {
        slots.set(mask, { column, row });
      }
    });
  });

  return slots;
}

export function blobTextureKey(prefix: string, mask: number): string {
  return `${prefix}-mask-${mask}`;
}
