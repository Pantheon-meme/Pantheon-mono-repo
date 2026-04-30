import {
  createPublicClient,
  createWalletClient,
  hexToString,
  http,
  stringToHex,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { loadLocalEnvFiles } from '../load-env';
import {
  expectedForageAmount,
  getForageObservation,
  getTerrainForageDefinition,
  recordForageObservation,
  terrainForageDefinitions,
} from './forage-knowledge';

const defaultRpcUrl = 'http://127.0.0.1:8545';
const defaultWorldAddress = '0xfDf868Ea710FfD8cd33b829c5AFf79eDd15EcD5f';
const defaultPrivateKey =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const defaultSpawnX = 100;
const defaultSpawnY = 100;
const forageRecoverSeconds = 24 * 60;

const pantheonWorldAbi = [
  {
    type: 'function',
    name: 'pantheon__spawn',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'x', type: 'int32' },
      { name: 'y', type: 'int32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'pantheon__move',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'x', type: 'int32' },
      { name: 'y', type: 'int32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'pantheon__movePath',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'xs', type: 'int32[]' },
      { name: 'ys', type: 'int32[]' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'pantheon__forage',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'x', type: 'int32' },
      { name: 'y', type: 'int32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'pantheon__sleep',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'pantheon__resolveAction',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'pantheon__getLastForageResult',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [
      { name: 'x', type: 'int32' },
      { name: 'y', type: 'int32' },
      { name: 'itemId', type: 'bytes32' },
      { name: 'amount', type: 'uint32' },
      { name: 'exists', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'getStaticField',
    stateMutability: 'view',
    inputs: [
      { name: 'tableId', type: 'bytes32' },
      { name: 'keyTuple', type: 'bytes32[]' },
      { name: 'fieldIndex', type: 'uint8' },
      { name: 'fieldLayout', type: 'bytes32' },
    ],
    outputs: [{ name: 'data', type: 'bytes32' }],
  },
] as const;

const playerStateTableId =
  '0x746270616e7468656f6e000000000000506c6179657253746174650000000000';
const playerStateFieldLayout =
  '0x001d070004040404080401000000000000000000000000000000000000000000';
const terrainTileTableId =
  '0x746270616e7468656f6e0000000000005465727261696e54696c650000000000';
const terrainTileFieldLayout =
  '0x0041030020200100000000000000000000000000000000000000000000000000';
const forageStateTableId =
  '0x746270616e7468656f6e000000000000466f7261676553746174650000000000';
const forageStateFieldLayout =
  '0x0009020008010000000000000000000000000000000000000000000000000000';
const pendingActionTableId =
  '0x746270616e7468656f6e00000000000050656e64696e67416374696f6e000000';
const pendingActionFieldLayout =
  '0x0055070020080404042001000000000000000000000000000000000000000000';
const actionLogTableId =
  '0x746270616e7468656f6e000000000000416374696f6e4c6f6700000000000000';
const actionLogFieldLayout =
  '0x0048020020080000000000000000000000000000000000000000000000000000';

export type PlayerSnapshot = {
  address: Hex;
  x: number;
  y: number;
  energy: number;
  maxEnergy: number;
  lastMoveAt: number;
  moveSpeed: number;
  exists: boolean;
  pendingAction?: PendingActionSnapshot;
  actionLog?: ActionLogSnapshot;
};

export type PendingActionSnapshot = {
  action: string;
  readyAt: number;
  x: number;
  y: number;
  value: number;
  exists: boolean;
};

export type ActionLogSnapshot = {
  action: string;
  updatedAt: number;
  message: string;
};

export type TerrainTileSnapshot = {
  x: number;
  y: number;
  terrainId: string;
  biomeId: string;
  forageable: boolean;
  recovering: boolean;
  lastForagedAt: number;
  expectedAmount: number;
  observation: ReturnType<typeof getForageObservation>;
};

export class PantheonMudClient {
  private readonly publicClient;
  private readonly walletClient;

  constructor(
    private readonly rpcUrl: string,
    private readonly worldAddress: Hex,
    private readonly privateKey: Hex,
  ) {
    const account = privateKeyToAccount(privateKey);

    this.publicClient = createPublicClient({
      chain: foundry,
      transport: http(rpcUrl),
    });
    this.walletClient = createWalletClient({
      account,
      chain: foundry,
      transport: http(rpcUrl),
    });
  }

  static fromEnv(): PantheonMudClient {
    loadLocalEnvFiles();
    if (process.env.INIT_CWD) {
      loadLocalEnvFiles(process.env.INIT_CWD);
    }

    return new PantheonMudClient(
      process.env.MUD_RPC_URL ??
        process.env.VITE_MUD_RPC_URL ??
        defaultRpcUrl,
      (process.env.MUD_WORLD_ADDRESS ??
        process.env.VITE_MUD_WORLD_ADDRESS ??
        defaultWorldAddress) as Hex,
      (process.env.MUD_PRIVATE_KEY ??
        process.env.VITE_MUD_PRIVATE_KEY ??
        defaultPrivateKey) as Hex,
    );
  }

  async getPlayer(): Promise<PlayerSnapshot | undefined> {
    const keyTuple = [addressToBytes32(this.walletClient.account.address)];

    try {
      const [
        xBlob,
        yBlob,
        energyBlob,
        maxEnergyBlob,
        lastMoveAtBlob,
        moveSpeedBlob,
        existsBlob,
      ] = await Promise.all([
        this.getStaticField(playerStateTableId, keyTuple, 0, playerStateFieldLayout),
        this.getStaticField(playerStateTableId, keyTuple, 1, playerStateFieldLayout),
        this.getStaticField(playerStateTableId, keyTuple, 2, playerStateFieldLayout),
        this.getStaticField(playerStateTableId, keyTuple, 3, playerStateFieldLayout),
        this.getStaticField(playerStateTableId, keyTuple, 4, playerStateFieldLayout),
        this.getStaticField(playerStateTableId, keyTuple, 5, playerStateFieldLayout),
        this.getStaticField(playerStateTableId, keyTuple, 6, playerStateFieldLayout),
      ]);

      if (!decodeBoolStaticField(existsBlob)) {
        return undefined;
      }

      return {
        address: this.walletClient.account.address,
        x: decodeInt32StaticField(xBlob),
        y: decodeInt32StaticField(yBlob),
        energy: decodeUint32StaticField(energyBlob),
        maxEnergy: decodeUint32StaticField(maxEnergyBlob),
        lastMoveAt: decodeUint64StaticField(lastMoveAtBlob),
        moveSpeed: decodeUint32StaticField(moveSpeedBlob),
        exists: true,
        pendingAction: await this.getPendingAction(keyTuple),
        actionLog: await this.getActionLog(keyTuple),
      };
    } catch {
      return undefined;
    }
  }

  async spawn(x = defaultSpawnX, y = defaultSpawnY) {
    const hash = await this.walletClient.writeContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: 'pantheon__spawn',
      args: [x, y],
      chain: foundry,
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    return { hash, player: await this.getPlayer() };
  }

  async move(x: number, y: number) {
    const hash = await this.walletClient.writeContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: 'pantheon__move',
      args: [x, y],
      chain: foundry,
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    return { hash, player: await this.getPlayer() };
  }

  async movePath(path: Array<{ x: number; y: number }>) {
    if (path.length === 0) {
      throw new Error('movePath needs at least one step');
    }

    const hash = await this.walletClient.writeContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: 'pantheon__movePath',
      args: [path.map((step) => step.x), path.map((step) => step.y)],
      chain: foundry,
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    return { hash, player: await this.getPlayer() };
  }

  async moveToward(targetX: number, targetY: number, maxSteps: number) {
    const player = await this.requirePlayer();
    const path = makeManhattanPath(player.x, player.y, targetX, targetY, maxSteps);

    return { path, ...(await this.movePath(path)) };
  }

  async forage(x: number, y: number) {
    const terrain = await this.getTerrainTile(x, y);
    const hash = await this.walletClient.writeContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: 'pantheon__forage',
      args: [x, y],
      chain: foundry,
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    const [resultX, resultY, itemId, amount, exists] =
      await this.publicClient.readContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: 'pantheon__getLastForageResult',
        args: [this.walletClient.account.address],
      });

    if (terrain?.terrainId) {
      recordForageObservation(terrain.terrainId, amount, decodeBytes32String(itemId));
    }

    return {
      hash,
      result: {
        x: resultX,
        y: resultY,
        itemId: decodeBytes32String(itemId),
        amount,
        exists,
      },
      terrain,
      player: await this.getPlayer(),
    };
  }

  async sleep() {
    const hash = await this.walletClient.writeContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: 'pantheon__sleep',
      args: [],
      chain: foundry,
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    return { hash, player: await this.getPlayer() };
  }

  async resolveAction() {
    const hash = await this.walletClient.writeContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: 'pantheon__resolveAction',
      args: [],
      chain: foundry,
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    return { hash, player: await this.getPlayer() };
  }

  async scanNearby(radius: number): Promise<TerrainTileSnapshot[]> {
    const player = await this.requirePlayer();
    const tiles: TerrainTileSnapshot[] = [];

    for (let y = player.y - radius; y <= player.y + radius; y += 1) {
      for (let x = player.x - radius; x <= player.x + radius; x += 1) {
        const tile = await this.getTerrainTile(x, y);
        if (tile) tiles.push(tile);
      }
    }

    return tiles.sort((a, b) => b.expectedAmount - a.expectedAmount);
  }

  getKnownForageLands() {
    return terrainForageDefinitions
      .map((definition) => ({
        terrainId: definition.terrainId,
        tableId: definition.tableId,
        baseChance: definition.baseChance,
        expectedAmount: expectedForageAmount(definition.terrainId),
        observation: getForageObservation(definition.terrainId),
        loot: definition.loot,
      }))
      .sort((a, b) => b.expectedAmount - a.expectedAmount);
  }

  private async requirePlayer(): Promise<PlayerSnapshot> {
    const player = await this.getPlayer();

    if (!player) {
      throw new Error('Player does not exist yet. Call spawnPlayer first.');
    }

    return player;
  }

  private async getTerrainTile(
    x: number,
    y: number,
  ): Promise<TerrainTileSnapshot | undefined> {
    const keyTuple = [int32ToBytes32(x), int32ToBytes32(y)];

    try {
      const [terrainBlob, biomeBlob, existsBlob, lastForagedBlob] = await Promise.all([
        this.getStaticField(terrainTileTableId, keyTuple, 0, terrainTileFieldLayout),
        this.getStaticField(terrainTileTableId, keyTuple, 1, terrainTileFieldLayout),
        this.getStaticField(terrainTileTableId, keyTuple, 2, terrainTileFieldLayout),
        this.getStaticField(forageStateTableId, keyTuple, 0, forageStateFieldLayout).catch(
          () => '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex,
        ),
      ]);

      if (!decodeBoolStaticField(existsBlob)) {
        return undefined;
      }

      const terrainId = decodeBytes32String(terrainBlob);
      const lastForagedAt = decodeUint64StaticField(lastForagedBlob);
      const recoverAt = lastForagedAt + forageRecoverSeconds;
      const recovering = lastForagedAt > 0 && nowSeconds() < recoverAt;

      return {
        x,
        y,
        terrainId,
        biomeId: decodeBytes32String(biomeBlob),
        forageable: getTerrainForageDefinition(terrainId) !== undefined,
        recovering,
        lastForagedAt,
        expectedAmount: recovering ? 0 : expectedForageAmount(terrainId),
        observation: getForageObservation(terrainId),
      };
    } catch {
      return undefined;
    }
  }

  private async getPendingAction(
    playerKeyTuple: Hex[],
  ): Promise<PendingActionSnapshot | undefined> {
    try {
      const [actionBlob, readyAtBlob, xBlob, yBlob, valueBlob, existsBlob] =
        await Promise.all([
          this.getStaticField(pendingActionTableId, playerKeyTuple, 0, pendingActionFieldLayout),
          this.getStaticField(pendingActionTableId, playerKeyTuple, 1, pendingActionFieldLayout),
          this.getStaticField(pendingActionTableId, playerKeyTuple, 2, pendingActionFieldLayout),
          this.getStaticField(pendingActionTableId, playerKeyTuple, 3, pendingActionFieldLayout),
          this.getStaticField(pendingActionTableId, playerKeyTuple, 4, pendingActionFieldLayout),
          this.getStaticField(pendingActionTableId, playerKeyTuple, 6, pendingActionFieldLayout),
        ]);

      if (!decodeBoolStaticField(existsBlob)) {
        return undefined;
      }

      return {
        action: decodeBytes32String(actionBlob),
        readyAt: decodeUint64StaticField(readyAtBlob),
        x: decodeInt32StaticField(xBlob),
        y: decodeInt32StaticField(yBlob),
        value: decodeUint32StaticField(valueBlob),
        exists: true,
      };
    } catch {
      return undefined;
    }
  }

  private async getActionLog(playerKeyTuple: Hex[]): Promise<ActionLogSnapshot | undefined> {
    try {
      const [actionBlob, updatedAtBlob, messageBlob] = await Promise.all([
        this.getStaticField(actionLogTableId, playerKeyTuple, 0, actionLogFieldLayout),
        this.getStaticField(actionLogTableId, playerKeyTuple, 1, actionLogFieldLayout),
        this.readActionLogMessage(playerKeyTuple),
      ]);

      return {
        action: decodeBytes32String(actionBlob),
        updatedAt: decodeUint64StaticField(updatedAtBlob),
        message: messageBlob,
      };
    } catch {
      return undefined;
    }
  }

  private async readActionLogMessage(_playerKeyTuple: Hex[]): Promise<string> {
    return '';
  }

  private async getStaticField(
    tableId: Hex,
    keyTuple: Hex[],
    fieldIndex: number,
    fieldLayout: Hex,
  ): Promise<Hex> {
    return this.publicClient.readContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: 'getStaticField',
      args: [tableId, keyTuple, fieldIndex, fieldLayout],
    });
  }
}

export function makePantheonMudClient(): PantheonMudClient {
  return PantheonMudClient.fromEnv();
}

function makeManhattanPath(
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  maxSteps: number,
): Array<{ x: number; y: number }> {
  const path: Array<{ x: number; y: number }> = [];
  let x = startX;
  let y = startY;

  while (path.length < maxSteps && (x !== targetX || y !== targetY)) {
    if (x !== targetX) {
      x += targetX > x ? 1 : -1;
    } else {
      y += targetY > y ? 1 : -1;
    }

    path.push({ x, y });
  }

  return path;
}

function addressToBytes32(address: Hex): Hex {
  return `0x${address.slice(2).padStart(64, '0')}`;
}

function int32ToBytes32(value: number): Hex {
  return `0x${BigInt.asUintN(256, BigInt(value)).toString(16).padStart(64, '0')}`;
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
  try {
    return hexToString(value, { size: 32 }).replace(/\0+$/, '');
  } catch {
    return '';
  }
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function bytes32(value: string): Hex {
  return stringToHex(value, { size: 32 });
}
