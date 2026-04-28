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
  {
    type: "function",
    name: "pantheon__move",
    stateMutability: "nonpayable",
    inputs: [
      { name: "x", type: "int32" },
      { name: "y", type: "int32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "pantheon__sleep",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "pantheon__resolveAction",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "getStaticField",
    stateMutability: "view",
    inputs: [
      { name: "tableId", type: "bytes32" },
      { name: "keyTuple", type: "bytes32[]" },
      { name: "fieldIndex", type: "uint8" },
      { name: "fieldLayout", type: "bytes32" },
    ],
    outputs: [{ name: "data", type: "bytes32" }],
  },
] as const;

const playerStateTableId =
  "0x746270616e7468656f6e000000000000506c6179657253746174650000000000";
const playerStateFieldLayout =
  "0x001d070004040404080401000000000000000000000000000000000000000000";
const playerEnergyFieldIndex = 2;
const playerMaxEnergyFieldIndex = 3;

export type ConfirmedDig = {
  x: number;
  y: number;
};

export type ConfirmedMove = {
  x: number;
  y: number;
};

export type PlayerEnergy = {
  energy: number;
  maxEnergy: number;
};

export type ConfirmedSleep = {
  amount: number;
  playerEnergy?: PlayerEnergy;
};

export type MudDigCallbacks = {
  onConfirmed: (dig: ConfirmedDig) => void;
  onRejected: (message: string) => void;
};

export type MudMoveCallbacks = {
  onConfirmed: (move: ConfirmedMove) => void;
  onRejected: (message: string) => void;
};

export type MudSleepCallbacks = {
  onConfirmed: (sleep: ConfirmedSleep) => void;
  onRejected: (message: string) => void;
};

export type MudStartSleepCallbacks = {
  onConfirmed: () => void;
  onRejected: (message: string) => void;
};

export class MudWorldBridge {
  private readonly publicClient;
  private readonly walletClient;
  private readonly pendingDigs = new Set<string>();
  private pendingMove = false;
  private pendingSleep = false;
  private pendingResolveAction = false;

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

  submitMove(x: number, y: number, callbacks: MudMoveCallbacks): boolean {
    if (this.pendingMove) {
      return false;
    }

    this.pendingMove = true;
    void this.confirmMove(x, y, callbacks);

    return true;
  }

  submitSleep(callbacks: MudStartSleepCallbacks): boolean {
    if (this.pendingSleep) {
      return false;
    }

    this.pendingSleep = true;
    void this.confirmSleep(callbacks);

    return true;
  }

  submitResolveAction(amount: number, callbacks: MudSleepCallbacks): boolean {
    if (this.pendingSleep || this.pendingResolveAction || amount <= 0) {
      return false;
    }

    this.pendingResolveAction = true;
    void this.confirmResolveAction(Math.floor(amount), callbacks);

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

  private async confirmMove(
    x: number,
    y: number,
    callbacks: MudMoveCallbacks,
  ): Promise<void> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "pantheon__move",
        args: [x, y],
        chain: foundry,
      });

      await this.publicClient.waitForTransactionReceipt({ hash });
      callbacks.onConfirmed({ x, y });
    } catch (error) {
      callbacks.onRejected(formatMudError(error));
    } finally {
      this.pendingMove = false;
    }
  }

  private async confirmSleep(
    callbacks: MudStartSleepCallbacks,
  ): Promise<void> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "pantheon__sleep",
        args: [],
        chain: foundry,
      });

      await this.publicClient.waitForTransactionReceipt({ hash });
      callbacks.onConfirmed();
    } catch (error) {
      callbacks.onRejected(formatMudError(error));
    } finally {
      this.pendingSleep = false;
    }
  }

  private async confirmResolveAction(
    amount: number,
    callbacks: MudSleepCallbacks,
  ): Promise<void> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "pantheon__resolveAction",
        args: [],
        chain: foundry,
      });

      await this.publicClient.waitForTransactionReceipt({ hash });
      callbacks.onConfirmed({
        amount,
        playerEnergy: await this.readPlayerEnergyAfterConfirmation(),
      });
    } catch (error) {
      callbacks.onRejected(formatMudError(error));
    } finally {
      this.pendingResolveAction = false;
    }
  }

  private async readPlayerEnergy(): Promise<PlayerEnergy | undefined> {
    const keyTuple = [addressToBytes32(this.walletClient.account.address)];

    const [energyBlob, maxEnergyBlob] = await Promise.all([
      this.publicClient.readContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "getStaticField",
        args: [
          playerStateTableId,
          keyTuple,
          playerEnergyFieldIndex,
          playerStateFieldLayout,
        ],
      }),
      this.publicClient.readContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "getStaticField",
        args: [
          playerStateTableId,
          keyTuple,
          playerMaxEnergyFieldIndex,
          playerStateFieldLayout,
        ],
      }),
    ]);

    return {
      energy: decodeUint32StaticField(energyBlob),
      maxEnergy: decodeUint32StaticField(maxEnergyBlob),
    };
  }

  private async readPlayerEnergyAfterConfirmation(): Promise<
    PlayerEnergy | undefined
  > {
    try {
      return await this.readPlayerEnergy();
    } catch {
      return undefined;
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

function addressToBytes32(address: Hex): Hex {
  return `0x${address.slice(2).padStart(64, "0")}`;
}

function decodeUint32StaticField(blob: Hex): number {
  return Number.parseInt(blob.slice(2, 10), 16);
}
