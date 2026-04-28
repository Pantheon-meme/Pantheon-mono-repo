import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

const defaultRpcUrl = "http://127.0.0.1:8545";
const defaultWorldAddress = "0xfDf868Ea710FfD8cd33b829c5AFf79eDd15EcD5f";
const defaultPrivateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const pantheonWorldAbi = [
  {
    type: "function",
    name: "pantheon__dig",
    stateMutability: "nonpayable",
    inputs: [
      { name: "x", type: "int32" },
      { name: "y", type: "int32" },
    ],
    outputs: [],
  },
] as const;

export type ConfirmedDig = {
  x: number;
  y: number;
};

export type MudDigCallbacks = {
  onConfirmed: (dig: ConfirmedDig) => void;
  onRejected: (message: string) => void;
};

export class MudWorldBridge {
  private readonly publicClient;
  private readonly walletClient;
  private readonly pendingDigs = new Set<string>();

  constructor(
    private readonly rpcUrl: string,
    private readonly worldAddress: Hex,
    privateKey: Hex,
  ) {
    this.publicClient = createPublicClient({
      chain: foundry,
      transport: http(this.rpcUrl),
    });
    this.walletClient = createWalletClient({
      account: privateKeyToAccount(privateKey),
      chain: foundry,
      transport: http(rpcUrl),
    });
  }

  static fromEnv(): MudWorldBridge {
    return new MudWorldBridge(
      import.meta.env.VITE_MUD_RPC_URL ?? defaultRpcUrl,
      import.meta.env.VITE_MUD_WORLD_ADDRESS ?? defaultWorldAddress,
      import.meta.env.VITE_MUD_PRIVATE_KEY ?? defaultPrivateKey,
    );
  }

  submitDig(x: number, y: number, callbacks: MudDigCallbacks): boolean {
    const key = `${x},${y}`;

    if (this.pendingDigs.has(key)) {
      return false;
    }

    this.pendingDigs.add(key);
    void this.confirmDig(x, y, key, callbacks);

    return true;
  }

  private async confirmDig(
    x: number,
    y: number,
    key: string,
    callbacks: MudDigCallbacks,
  ): Promise<void> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "pantheon__dig",
        args: [x, y],
        chain: foundry,
      });

      await this.publicClient.waitForTransactionReceipt({ hash });
      callbacks.onConfirmed({ x, y });
    } catch (error) {
      callbacks.onRejected(formatMudError(error));
    } finally {
      this.pendingDigs.delete(key);
    }
  }
}

function formatMudError(error: unknown): string {
  if (typeof error === "object" && error) {
    const maybeError = error as { shortMessage?: string; message?: string };

    return maybeError.shortMessage ?? maybeError.message ?? "MUD transaction failed";
  }

  return "MUD transaction failed";
}
