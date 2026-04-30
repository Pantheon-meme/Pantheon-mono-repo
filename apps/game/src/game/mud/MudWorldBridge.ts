import {
  createPublicClient,
  createWalletClient,
  hexToString,
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
    name: "pantheon__forage",
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
    name: "pantheon__movePath",
    stateMutability: "nonpayable",
    inputs: [
      { name: "xs", type: "int32[]" },
      { name: "ys", type: "int32[]" },
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
    name: "pantheon__getLastForageResult",
    stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [
      { name: "x", type: "int32" },
      { name: "y", type: "int32" },
      { name: "itemId", type: "bytes32" },
      { name: "amount", type: "uint32" },
      { name: "exists", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "pantheon__getWorldObjectCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "count", type: "uint32" }],
  },
  {
    type: "function",
    name: "pantheon__getWorldObject",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint32" }],
    outputs: [
      { name: "objectId", type: "bytes32" },
      { name: "x", type: "int32" },
      { name: "y", type: "int32" },
      { name: "itemId", type: "bytes32" },
      { name: "amount", type: "uint32" },
      { name: "spawnedBy", type: "address" },
      { name: "createdAt", type: "uint64" },
      { name: "exists", type: "bool" },
    ],
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
  {
    type: "function",
    name: "getDynamicField",
    stateMutability: "view",
    inputs: [
      { name: "tableId", type: "bytes32" },
      { name: "keyTuple", type: "bytes32[]" },
      { name: "fieldIndex", type: "uint8" },
    ],
    outputs: [{ name: "data", type: "bytes" }],
  },
] as const;

const playerStateTableId =
  "0x746270616e7468656f6e000000000000506c6179657253746174650000000000";
const playerStateFieldLayout =
  "0x001d070004040404080401000000000000000000000000000000000000000000";
const playerXFieldIndex = 0;
const playerYFieldIndex = 1;
const playerEnergyFieldIndex = 2;
const playerMaxEnergyFieldIndex = 3;
const playerLastMoveAtFieldIndex = 4;
const playerMoveSpeedFieldIndex = 5;
const playerExistsFieldIndex = 6;
const pendingActionTableId =
  "0x746270616e7468656f6e00000000000050656e64696e67416374696f6e000000";
const pendingActionFieldLayout =
  "0x0055070020080404042001000000000000000000000000000000000000000000";
const pendingActionActionFieldIndex = 0;
const pendingActionReadyAtFieldIndex = 1;
const pendingActionValueFieldIndex = 4;
const pendingActionExistsFieldIndex = 6;
const worldTimeTableId =
  "0x746270616e7468656f6e000000000000576f726c6454696d6500000000000000";
const worldTimeFieldLayout =
  "0x0011030008080100000000000000000000000000000000000000000000000000";
const worldTimeStartedAtFieldIndex = 0;
const worldTimeDayLengthFieldIndex = 1;
const worldTimeKey = "0x776f726c64000000000000000000000000000000000000000000000000000000";
const actionLogTableId =
  "0x746270616e7468656f6e000000000000416374696f6e4c6f6700000000000000";
const actionLogFieldLayout =
  "0x0028020120080000000000000000000000000000000000000000000000000000";
const actionLogActionFieldIndex = 0;
const actionLogUpdatedAtFieldIndex = 1;
const actionLogMessageFieldIndex = 0;

export type ConfirmedDig = {
  x: number;
  y: number;
  playerEnergy?: PlayerEnergy;
};

export type ConfirmedForage = {
  x: number;
  y: number;
  itemId: string;
  amount: number;
  playerEnergy?: PlayerEnergy;
};

export type WorldObjectSnapshot = {
  objectId: string;
  x: number;
  y: number;
  itemId: string;
  amount: number;
  spawnedBy: string;
  createdAt: number;
};

export type ConfirmedMove = {
  x: number;
  y: number;
  playerEnergy?: PlayerEnergy;
};

export type MovePathStep = {
  x: number;
  y: number;
};

export type PlayerEnergy = {
  energy: number;
  maxEnergy: number;
  updatedAt?: number;
};

export type PlayerSnapshot = PlayerEnergy & {
  x: number;
  y: number;
  lastMoveAt: number;
  moveSpeed: number;
  exists: boolean;
  actionLog?: ActionLogSnapshot;
  pendingAction?: PendingActionSnapshot;
  worldObjects: WorldObjectSnapshot[];
};

export type ActionLogSnapshot = {
  action: string;
  updatedAt: number;
  message: string;
};

export type WorldTimeConfig = {
  startedAt: number;
  dayLength: number;
};

export type PendingActionSnapshot = {
  action: string;
  readyAt: number;
  value: number;
  playerEnergy?: PlayerEnergy;
};

export type MudDigCallbacks = {
  onConfirmed: (dig: ConfirmedDig) => void;
  onRejected: (message: string) => void;
};

export type MudForageCallbacks = {
  onConfirmed: (forage: ConfirmedForage) => void;
  onRejected: (message: string) => void;
};

export type MudMoveCallbacks = {
  onConfirmed: (move: ConfirmedMove) => void;
  onRejected: (message: string) => void;
};

export type MudStartSleepCallbacks = {
  onConfirmed: (action: PendingActionSnapshot) => void;
  onRejected: (message: string) => void;
};

export class MudWorldBridge {
  private readonly publicClient;
  private readonly walletClient;
  private readonly pendingDigs = new Set<string>();
  private readonly pendingForages = new Set<string>();
  private readonly cachedWorldObjects: WorldObjectSnapshot[] = [];
  private cachedWorldObjectCount = 0;
  private pendingMove = false;
  private pendingSleep = false;

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

  submitForage(x: number, y: number, callbacks: MudForageCallbacks): boolean {
    const key = `${x},${y}`;

    if (this.pendingForages.has(key)) {
      return false;
    }

    this.pendingForages.add(key);
    void this.confirmForage(x, y, key, callbacks);

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

  submitMovePath(path: MovePathStep[], callbacks: MudMoveCallbacks): boolean {
    if (this.pendingMove || path.length === 0) {
      return false;
    }

    this.pendingMove = true;
    void this.confirmMovePath(path, callbacks);

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

  async readWorldTime(): Promise<WorldTimeConfig | undefined> {
    try {
      const keyTuple = [worldTimeKey as Hex];
      const [startedAtBlob, dayLengthBlob] = await Promise.all([
        this.publicClient.readContract({
          address: this.worldAddress,
          abi: pantheonWorldAbi,
          functionName: "getStaticField",
          args: [
            worldTimeTableId,
            keyTuple,
            worldTimeStartedAtFieldIndex,
            worldTimeFieldLayout,
          ],
        }),
        this.publicClient.readContract({
          address: this.worldAddress,
          abi: pantheonWorldAbi,
          functionName: "getStaticField",
          args: [
            worldTimeTableId,
            keyTuple,
            worldTimeDayLengthFieldIndex,
            worldTimeFieldLayout,
          ],
        }),
      ]);

      const startedAt = decodeUint64StaticField(startedAtBlob);
      const dayLength = decodeUint64StaticField(dayLengthBlob);

      if (startedAt <= 0 || dayLength <= 0) {
        return undefined;
      }

      return { startedAt, dayLength };
    } catch {
      return undefined;
    }
  }

  async readPlayerSnapshot(): Promise<PlayerSnapshot | undefined> {
    try {
      const keyTuple = [addressToBytes32(this.walletClient.account.address)];
      const [
        xBlob,
        yBlob,
        energyBlob,
        maxEnergyBlob,
        lastMoveAtBlob,
        moveSpeedBlob,
        existsBlob,
      ] = await Promise.all([
        this.readPlayerStaticField(keyTuple, playerXFieldIndex),
        this.readPlayerStaticField(keyTuple, playerYFieldIndex),
        this.readPlayerStaticField(keyTuple, playerEnergyFieldIndex),
        this.readPlayerStaticField(keyTuple, playerMaxEnergyFieldIndex),
        this.readPlayerStaticField(keyTuple, playerLastMoveAtFieldIndex),
        this.readPlayerStaticField(keyTuple, playerMoveSpeedFieldIndex),
        this.readPlayerStaticField(keyTuple, playerExistsFieldIndex),
      ]);

      const exists = decodeBoolStaticField(existsBlob);

      if (!exists) {
        return undefined;
      }

      return {
        x: decodeInt32StaticField(xBlob),
        y: decodeInt32StaticField(yBlob),
        energy: decodeUint32StaticField(energyBlob),
        maxEnergy: decodeUint32StaticField(maxEnergyBlob),
        lastMoveAt: decodeUint64StaticField(lastMoveAtBlob),
        moveSpeed: decodeUint32StaticField(moveSpeedBlob),
        exists,
        actionLog: await this.readActionLogAfterConfirmation(keyTuple),
        pendingAction: await this.readPendingActionAfterConfirmationOptional(),
        worldObjects: await this.readWorldObjectsAfterConfirmation(),
      };
    } catch {
      return undefined;
    }
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
      callbacks.onConfirmed({
        x,
        y,
        playerEnergy: await this.readPlayerEnergyAfterConfirmation(),
      });
    } catch (error) {
      callbacks.onRejected(formatMudError(error));
    } finally {
      this.pendingDigs.delete(key);
    }
  }

  private async confirmForage(
    x: number,
    y: number,
    key: string,
    callbacks: MudForageCallbacks,
  ): Promise<void> {
    try {
      const hash = await this.walletClient.writeContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "pantheon__forage",
        args: [x, y],
        chain: foundry,
      });

      await this.publicClient.waitForTransactionReceipt({ hash });
      callbacks.onConfirmed({
        ...(await this.readLastForageResultAfterConfirmation(x, y)),
        playerEnergy: await this.readPlayerEnergyAfterConfirmation(),
      });
    } catch (error) {
      callbacks.onRejected(formatMudError(error));
    } finally {
      this.pendingForages.delete(key);
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
      callbacks.onConfirmed({
        x,
        y,
        playerEnergy: await this.readPlayerEnergyAfterConfirmation(),
      });
    } catch (error) {
      callbacks.onRejected(formatMudError(error));
    } finally {
      this.pendingMove = false;
    }
  }

  private async confirmMovePath(
    path: MovePathStep[],
    callbacks: MudMoveCallbacks,
  ): Promise<void> {
    const target = path[path.length - 1];

    try {
      const hash = await this.walletClient.writeContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "pantheon__movePath",
        args: [path.map((step) => step.x), path.map((step) => step.y)],
        chain: foundry,
      });

      await this.publicClient.waitForTransactionReceipt({ hash });
      callbacks.onConfirmed({
        ...target,
        playerEnergy: await this.readPlayerEnergyAfterConfirmation(),
      });
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
      callbacks.onConfirmed(await this.readPendingActionAfterConfirmation());
    } catch (error) {
      callbacks.onRejected(formatMudError(error));
    } finally {
      this.pendingSleep = false;
    }
  }

  private async readPlayerEnergy(): Promise<PlayerEnergy | undefined> {
    const keyTuple = [addressToBytes32(this.walletClient.account.address)];

    const [energyBlob, maxEnergyBlob, updatedAtBlob] = await Promise.all([
      this.readPlayerStaticField(keyTuple, playerEnergyFieldIndex),
      this.readPlayerStaticField(keyTuple, playerMaxEnergyFieldIndex),
      this.publicClient
        .readContract({
          address: this.worldAddress,
          abi: pantheonWorldAbi,
          functionName: "getStaticField",
          args: [
            actionLogTableId,
            keyTuple,
            actionLogUpdatedAtFieldIndex,
            actionLogFieldLayout,
          ],
        })
        .catch(() => undefined),
    ]);

    return {
      energy: decodeUint32StaticField(energyBlob),
      maxEnergy: decodeUint32StaticField(maxEnergyBlob),
      updatedAt: updatedAtBlob
        ? decodeUint64StaticField(updatedAtBlob)
        : undefined,
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

  private async readActionLogAfterConfirmation(
    keyTuple: Hex[],
  ): Promise<ActionLogSnapshot | undefined> {
    try {
      const [actionBlob, updatedAtBlob, messageBlob] = await Promise.all([
        this.publicClient.readContract({
          address: this.worldAddress,
          abi: pantheonWorldAbi,
          functionName: "getStaticField",
          args: [
            actionLogTableId,
            keyTuple,
            actionLogActionFieldIndex,
            actionLogFieldLayout,
          ],
        }),
        this.publicClient.readContract({
          address: this.worldAddress,
          abi: pantheonWorldAbi,
          functionName: "getStaticField",
          args: [
            actionLogTableId,
            keyTuple,
            actionLogUpdatedAtFieldIndex,
            actionLogFieldLayout,
          ],
        }),
        this.publicClient.readContract({
          address: this.worldAddress,
          abi: pantheonWorldAbi,
          functionName: "getDynamicField",
          args: [actionLogTableId, keyTuple, actionLogMessageFieldIndex],
        }),
      ]);

      return {
        action: decodeBytes32String(actionBlob),
        updatedAt: decodeUint64StaticField(updatedAtBlob),
        message: decodeDynamicString(messageBlob),
      };
    } catch {
      return undefined;
    }
  }

  private async readLastForageResultAfterConfirmation(
    fallbackX: number,
    fallbackY: number,
  ): Promise<Omit<ConfirmedForage, "playerEnergy">> {
    try {
      const result = await this.readLastForageResult();

      if (result) {
        return result;
      }
    } catch {
      // Fall through to a no-drop result if the read is temporarily unavailable.
    }

    return { x: fallbackX, y: fallbackY, itemId: "", amount: 0 };
  }

  async readWorldObjects(): Promise<WorldObjectSnapshot[]> {
    const count = await this.publicClient.readContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: "pantheon__getWorldObjectCount",
      args: [],
    });
    if (count < this.cachedWorldObjectCount) {
      this.cachedWorldObjects.length = 0;
      this.cachedWorldObjectCount = 0;
    }

    for (let index = this.cachedWorldObjectCount + 1; index <= count; index += 1) {
      const [
        objectId,
        x,
        y,
        itemId,
        amount,
        spawnedBy,
        createdAt,
        exists,
      ] = await this.publicClient.readContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: "pantheon__getWorldObject",
        args: [index],
      });

      if (!exists || amount <= 0) {
        continue;
      }

      this.cachedWorldObjects.push({
        objectId,
        x,
        y,
        itemId: decodeBytes32String(itemId),
        amount,
        spawnedBy,
        createdAt: Number(createdAt),
      });
    }

    this.cachedWorldObjectCount = count;

    return [...this.cachedWorldObjects];
  }

  private async readWorldObjectsAfterConfirmation(): Promise<
    WorldObjectSnapshot[]
  > {
    try {
      return await this.readWorldObjects();
    } catch {
      return [];
    }
  }

  private async readLastForageResult(): Promise<
    Omit<ConfirmedForage, "playerEnergy"> | undefined
  > {
    const [x, y, itemId, amount, exists] = await this.publicClient.readContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: "pantheon__getLastForageResult",
      args: [this.walletClient.account.address],
    });

    if (!exists || amount <= 0) {
      return undefined;
    }

    return {
      x,
      y,
      itemId: decodeBytes32String(itemId),
      amount,
    };
  }

  private async readPlayerStaticField(
    keyTuple: Hex[],
    fieldIndex: number,
  ): Promise<Hex> {
    return this.publicClient.readContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: "getStaticField",
      args: [
        playerStateTableId,
        keyTuple,
        fieldIndex,
        playerStateFieldLayout,
      ],
    });
  }

  private async readPendingActionAfterConfirmation(): Promise<PendingActionSnapshot> {
    try {
      const pendingAction = await this.readPendingAction();

      if (pendingAction) {
        return {
          ...pendingAction,
          playerEnergy: await this.readPlayerEnergyAfterConfirmation(),
        };
      }
    } catch {
      // Fall back to the local default when the read is temporarily unavailable.
    }

    return {
      action: "sleep",
      readyAt: Math.floor(Date.now() / 1000) + 6,
      value: 24,
      playerEnergy: await this.readPlayerEnergyAfterConfirmation(),
    };
  }

  private async readPendingActionAfterConfirmationOptional(): Promise<
    PendingActionSnapshot | undefined
  > {
    try {
      return await this.readPendingAction();
    } catch {
      return undefined;
    }
  }

  private async readPendingAction(): Promise<PendingActionSnapshot | undefined> {
    const keyTuple = [addressToBytes32(this.walletClient.account.address)];
    const [actionBlob, readyAtBlob, valueBlob, existsBlob] = await Promise.all([
      this.readPendingActionStaticField(keyTuple, pendingActionActionFieldIndex),
      this.readPendingActionStaticField(keyTuple, pendingActionReadyAtFieldIndex),
      this.readPendingActionStaticField(keyTuple, pendingActionValueFieldIndex),
      this.readPendingActionStaticField(keyTuple, pendingActionExistsFieldIndex),
    ]);

    if (!decodeBoolStaticField(existsBlob)) {
      return undefined;
    }

    return {
      action: decodeBytes32String(actionBlob),
      readyAt: decodeUint64StaticField(readyAtBlob),
      value: decodeUint32StaticField(valueBlob),
    };
  }

  private async readPendingActionStaticField(
    keyTuple: Hex[],
    fieldIndex: number,
  ): Promise<Hex> {
    return this.publicClient.readContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: "getStaticField",
      args: [
        pendingActionTableId,
        keyTuple,
        fieldIndex,
        pendingActionFieldLayout,
      ],
    });
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

function decodeUint64StaticField(blob: Hex): number {
  return Number.parseInt(blob.slice(2, 18), 16);
}

function decodeInt32StaticField(blob: Hex): number {
  const value = decodeUint32StaticField(blob);

  return value > 0x7fffffff ? value - 0x100000000 : value;
}

function decodeBoolStaticField(blob: Hex): boolean {
  return Number.parseInt(blob.slice(2, 4), 16) !== 0;
}

function decodeBytes32String(value: Hex): string {
  return hexToString(value, { size: 32 }).replace(/\0+$/, "");
}

function decodeDynamicString(value: Hex): string {
  return hexToString(value).replace(/\0+$/, "");
}
