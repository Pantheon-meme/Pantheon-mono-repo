import { hexToString, padHex, stringToHex, type Hex } from "viem";

export function addressToBytes32(address: Hex): Hex {
  return `0x${address.slice(2).padStart(64, "0")}`;
}

export function stringToBytes32(value: string): Hex {
  return padHex(stringToHex(value), { dir: "right", size: 32 });
}

export function int32ToBytes32(value: number): Hex {
  const normalized = BigInt.asUintN(256, BigInt(value));

  return `0x${normalized.toString(16).padStart(64, "0")}`;
}

export function decodeUint32StaticField(blob: Hex): number {
  return Number.parseInt(blob.slice(2, 10), 16);
}

export function decodeUint8StaticField(blob: Hex): number {
  return Number.parseInt(blob.slice(2, 4), 16);
}

export function decodeUint64StaticField(blob: Hex): number {
  return Number.parseInt(blob.slice(2, 18), 16);
}

export function decodeUint256StaticField(blob: Hex): bigint {
  return BigInt(blob);
}

export function decodeInt32StaticField(blob: Hex): number {
  const value = decodeUint32StaticField(blob);

  return value > 0x7fffffff ? value - 0x100000000 : value;
}

export function decodeBoolStaticField(blob: Hex): boolean {
  return Number.parseInt(blob.slice(2, 4), 16) !== 0;
}

export function decodeBytes32String(value: Hex): string {
  return hexToString(value, { size: 32 }).replace(/\0+$/, "");
}

export function decodeDynamicString(value: Hex): string {
  return hexToString(value).replace(/\0+$/, "");
}
