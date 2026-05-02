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

export const cucBalanceTableId =
  "0x746270616e7468656f6e00000000000043756342616c616e6365000000000000";
export const cucBalanceFieldLayout =
  "0x0021020020010000000000000000000000000000000000000000000000000000";
export const cucBalanceBalanceFieldIndex = 0;
export const cucBalanceExistsFieldIndex = 1;

export const bankItemPriceTableId =
  "0x746270616e7468656f6e00000000000042616e6b4974656d5072696365000000";
export const bankItemPriceFieldLayout =
  "0x0055070020200404080401000000000000000000000000000000000000000000";
export const bankItemPriceBuyPriceFieldIndex = 0;
export const bankItemPriceSellPriceFieldIndex = 1;
export const bankItemPriceBuyMaxQuantityFieldIndex = 2;
export const bankItemPriceSellMaxQuantityFieldIndex = 3;
export const bankItemPriceValidUntilFieldIndex = 4;
export const bankItemPriceEpochFieldIndex = 5;
export const bankItemPriceExistsFieldIndex = 6;

export const bankItemInventoryTableId =
  "0x746270616e7468656f6e00000000000042616e6b4974656d496e76656e746f72";
export const bankItemInventoryFieldLayout =
  "0x0005020004010000000000000000000000000000000000000000000000000000";
export const bankItemInventoryQuantityFieldIndex = 0;
export const bankItemInventoryExistsFieldIndex = 1;

export const bankInventorySlotTableId =
  "0x746270616e7468656f6e00000000000042616e6b496e76656e746f7279536c6f";
export const bankInventorySlotFieldLayout =
  "0x0021020020010000000000000000000000000000000000000000000000000000";
export const bankInventorySlotObjectIdFieldIndex = 0;
export const bankInventorySlotExistsFieldIndex = 1;

export const bankObjectTableId =
  "0x746270616e7468656f6e00000000000042616e6b4f626a656374000000000000";
export const bankObjectFieldLayout =
  "0x0005020004010000000000000000000000000000000000000000000000000000";
export const bankObjectSlotFieldIndex = 0;
export const bankObjectExistsFieldIndex = 1;

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

export const farmTileStateTableId =
  "0x746270616e7468656f6e0000000000004661726d54696c655374617465000000";
export const farmTileStateFieldLayout =
  "0x001d060004040408080100000000000000000000000000000000000000000000";
export const farmTileStateMoistureFieldIndex = 0;
export const farmTileStateFertilityFieldIndex = 1;
export const farmTileStateExhaustionFieldIndex = 2;
export const farmTileStateLastMaintainedAtFieldIndex = 3;
export const farmTileStateLastWateredAtFieldIndex = 4;
export const farmTileStateExistsFieldIndex = 5;

export const zeroBytes32: Hex =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
