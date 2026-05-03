import {
  uniswapBaseObjectSheetId,
  uniswapBiomeObjectSheets,
} from "./uniswap-biome-asset-plan.js";
import { allProtocolObjectSheets } from "./protocol-biome-asset-plan.js";

export {
  uniswapBaseObjectSheetId as uniswapCommonsObjectSheetId,
  type BiomeObjectSpriteDefinition,
} from "./uniswap-biome-asset-plan.js";
export { uniswapBiomeObjectSheets } from "./uniswap-biome-asset-plan.js";

export const allBiomeObjectSheets = [
  ...uniswapBiomeObjectSheets,
  ...allProtocolObjectSheets,
];

export const uniswapCommonsObjectSprites =
  uniswapBiomeObjectSheets.find(
    (sheet) => sheet.id === uniswapBaseObjectSheetId,
  )?.objects ?? [];
