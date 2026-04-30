import {
  objectSpriteAssets,
  type ObjectSpriteAsset,
} from "../../assets/object-sprites/ObjectSpriteAssets";
import { plantSpriteTextureKey } from "../plants/PlantSpriteAssets";

export type ForageItemSpriteCell = {
  sheetId: string;
  row: number;
  column: number;
};

const forageItemSpriteOrder = [
  "wild_fiber",
  "violet_clover",
  "pearl_dew",
  "unicorn_petal",
  "forest_root",
  "fee_moss_mushroom",
  "fallen_unicorn_branch",
  "bubble_moss",
  "oracle_silt",
  "glassy_spore",
  "pearl_shell",
  "lake_glass_pebble",
  "swapstone_dust",
  "swapstone_pebble",
  "governance_stone_chip",
  "route_silk_fiber",
  "marker_pebble",
  "oracle_glass_crystal",
  "copper_ore",
  "opal_gem",
  "mint_reed_fiber",
  "pearl_moss",
  "violet_mycela",
  "glass_reed_shard",
  "liquidity_algae",
  "rose_quartz_chip",
  "civic_clay",
  "route_thread_spool",
  "swamp_glass_nodule",
  "oracle_amber",
  "pool_pearl",
  "moonlit_bark",
] as const;

const forageItemSpriteCells: Record<string, ForageItemSpriteCell> =
  Object.fromEntries(
    forageItemSpriteOrder.map((itemId, index) => [
      itemId,
      {
        sheetId: index < 16 ? "forage-resources-a" : "forage-resources-b",
        row: Math.floor((index % 16) / 4),
        column: index % 4,
      },
    ]),
  );
const forageObjectSpriteRegistry: Record<string, ObjectSpriteAsset> =
  objectSpriteAssets;

export function getForageItemSpriteCell(
  itemId: string,
): ForageItemSpriteCell | undefined {
  return forageItemSpriteCells[itemId];
}

export function getForageItemSpriteAsset(
  itemId: string,
): ObjectSpriteAsset | undefined {
  const cell = getForageItemSpriteCell(itemId);

  return cell ? forageObjectSpriteRegistry[cell.sheetId] : undefined;
}

export function forageItemSpriteTextureKey(itemId: string): string | undefined {
  const cell = getForageItemSpriteCell(itemId);

  return cell ? plantSpriteTextureKey(cell.sheetId) : undefined;
}
