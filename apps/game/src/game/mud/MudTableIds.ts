import type { Hex } from "viem";

export const playerStateTableId =
  "0x746270616e7468656f6e000000000000506c6179657253746174650000000000";
export const playerStateFieldLayout =
  "0x001d070004040404080401000000000000000000000000000000000000000000";
export const playerXFieldIndex = 0;
export const playerYFieldIndex = 1;
export const playerEnergyFieldIndex = 2;
export const playerMaxEnergyFieldIndex = 3;
export const playerLastMoveAtFieldIndex = 4;
export const playerMoveSpeedFieldIndex = 5;
export const playerExistsFieldIndex = 6;

export const pendingActionTableId =
  "0x746270616e7468656f6e00000000000050656e64696e67416374696f6e000000";
export const pendingActionFieldLayout =
  "0x0055070020080404042001000000000000000000000000000000000000000000";
export const pendingActionActionFieldIndex = 0;
export const pendingActionReadyAtFieldIndex = 1;
export const pendingActionValueFieldIndex = 4;
export const pendingActionExistsFieldIndex = 6;

export const worldTimeTableId =
  "0x746270616e7468656f6e000000000000576f726c6454696d6500000000000000";
export const worldTimeFieldLayout =
  "0x0011030008080100000000000000000000000000000000000000000000000000";
export const worldTimeStartedAtFieldIndex = 0;
export const worldTimeDayLengthFieldIndex = 1;
export const worldTimeKey =
  "0x776f726c64000000000000000000000000000000000000000000000000000000";

export const actionLogTableId =
  "0x746270616e7468656f6e000000000000416374696f6e4c6f6700000000000000";
export const actionLogFieldLayout =
  "0x0028020120080000000000000000000000000000000000000000000000000000";
export const actionLogActionFieldIndex = 0;
export const actionLogUpdatedAtFieldIndex = 1;
export const actionLogMessageFieldIndex = 0;

export const terrainStateTableId =
  "0x746270616e7468656f6e0000000000005465727261696e537461746500000000";
export const terrainStateFieldLayout =
  "0x0025030020040100000000000000000000000000000000000000000000000000";
export const terrainStateMaterialFieldIndex = 0;
export const terrainStateDigDepthFieldIndex = 1;
export const terrainStateLoosenedFieldIndex = 2;

export const plantStateTableId =
  "0x746270616e7468656f6e000000000000506c616e745374617465000000000000";
export const plantStateFieldLayout =
  "0x004e080020140801040408010000000000000000000000000000000000000000";
export const plantStatePlantIdFieldIndex = 0;
export const plantStatePlantedAtFieldIndex = 2;
export const plantStateStageFieldIndex = 3;
export const plantStateHealthFieldIndex = 4;
export const plantStateStressFieldIndex = 5;
export const plantStateExistsFieldIndex = 7;

export const zeroBytes32: Hex =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
