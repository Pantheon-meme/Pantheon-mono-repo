import type { Hex } from "viem";

export class OnchainObjectRef {
  constructor(public readonly objectId: Hex) {}
}
