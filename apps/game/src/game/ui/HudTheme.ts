import type Phaser from "phaser";

export const hudFontFamily = "Inter, system-ui, sans-serif";

export const hudColors = {
  panel: 0x17242b,
  panelDark: 0x0d151a,
  panelWarm: 0x2f2a21,
  track: 0x233139,
  trackDark: 0x10191f,
  border: 0xe8f0e8,
  borderWarm: 0xf1d38b,
  text: "#eef7f4",
  textSoft: "#dce8e2",
  textWarm: "#f6efd7",
  textDark: "#101820",
  energy: 0x66d685,
  energyLow: 0xee6b5f,
  energyMedium: 0xf0c85a,
  health: 0xee6b5f,
  sleep: 0x7bd7ff,
  progress: 0xf0c85a,
  success: 0x78d889,
  warning: 0xf0c85a,
  danger: 0xee6b5f,
  pending: 0x7bd7ff,
  selected: 0xfff3a1,
  disabled: 0x6f7d80,
};

export type HudStatus =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "pending"
  | "disabled";

export function hudStatusColor(status: HudStatus): number {
  switch (status) {
    case "success":
      return hudColors.success;
    case "warning":
      return hudColors.warning;
    case "danger":
      return hudColors.danger;
    case "pending":
      return hudColors.pending;
    case "disabled":
      return hudColors.disabled;
    case "default":
      return hudColors.borderWarm;
  }
}

export function hudShadow(): Phaser.Types.GameObjects.Text.TextShadow {
  return {
    color: "#071018",
    blur: 4,
    fill: true,
    offsetX: 1,
    offsetY: 1,
  };
}
