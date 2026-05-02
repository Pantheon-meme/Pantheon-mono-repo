import type { Hex } from "viem";

export class RemotePlayer {
  constructor(
    public readonly address: Hex,
    public readonly label: string,
  ) {}
}
