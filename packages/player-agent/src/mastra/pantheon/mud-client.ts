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
    name: 'pantheon__setBankAgent',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'pantheon__setBankItemPrice',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'itemId', type: 'bytes32' },
      { name: 'buyPrice', type: 'uint256' },
      { name: 'sellPrice', type: 'uint256' },
      { name: 'buyMaxQuantity', type: 'uint32' },
      { name: 'sellMaxQuantity', type: 'uint32' },
      { name: 'validUntil', type: 'uint64' },
      { name: 'epoch', type: 'uint32' },
    ],
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
const bankItemPriceTableId =
  '0x746270616e7468656f6e00000000000042616e6b4974656d5072696365000000';
const bankItemPriceFieldLayout =
  '0x0055070020200404080401000000000000000000000000000000000000000000';
const bankItemInventoryTableId =
  '0x746270616e7468656f6e00000000000042616e6b4974656d496e76656e746f72';
const bankItemInventoryFieldLayout =
  '0x0005020004010000000000000000000000000000000000000000000000000000';

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

export type ForageExpeditionOptions = {
  radius?: number;
  maxForages?: number;
  maxMoveStepsPerTarget?: number;
  minEnergy?: number;
  sleepWhenLowEnergy?: boolean;
  spawnIfMissing?: boolean;
};

export type ForageExpeditionResult = {
  status:
    | 'completed'
    | 'spawned'
    | 'pending-action'
    | 'low-energy'
    | 'no-targets'
    | 'blocked';
  summary: string;
  actions: string[];
  forages: Array<{
    x: number;
    y: number;
    terrainId?: string;
    itemId: string;
    amount: number;
  }>;
  tilesConsidered: number;
  player?: PlayerSnapshot;
  error?: string;
  memory?: {
    stored: boolean;
    note?: string;
    reason?: string;
  };
};

export type BankItemQuoteSnapshot = {
  itemId: string;
  inventoryQuantity: number;
  buyPrice: bigint;
  sellPrice: bigint;
  buyMaxQuantity: number;
  sellMaxQuantity: number;
  validUntil: number;
  epoch: number;
  priceExists: boolean;
};

export type BankItemPriceInput = {
  itemId: string;
  buyPrice: bigint;
  sellPrice: bigint;
  buyMaxQuantity: number;
  sellMaxQuantity: number;
  validUntil: number;
  epoch: number;
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

  async setBankAgent(agent = this.walletClient.account.address) {
    const hash = await this.walletClient.writeContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: 'pantheon__setBankAgent',
      args: [agent],
      chain: foundry,
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    return { hash, agent };
  }

  async setBankItemPrice(price: BankItemPriceInput) {
    const hash = await this.walletClient.writeContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: 'pantheon__setBankItemPrice',
      args: [
        bytes32(price.itemId),
        price.buyPrice,
        price.sellPrice,
        price.buyMaxQuantity,
        price.sellMaxQuantity,
        BigInt(price.validUntil),
        price.epoch,
      ],
      chain: foundry,
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    return { hash, price };
  }

  async getBankItemQuote(itemId: string): Promise<BankItemQuoteSnapshot> {
    const keyTuple = [bytes32(itemId)];
    const zero =
      '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex;

    const [
      buyPriceBlob,
      sellPriceBlob,
      buyMaxQuantityBlob,
      sellMaxQuantityBlob,
      validUntilBlob,
      epochBlob,
      priceExistsBlob,
      inventoryQuantityBlob,
    ] = await Promise.all([
      this.getStaticField(bankItemPriceTableId, keyTuple, 0, bankItemPriceFieldLayout).catch(
        () => zero,
      ),
      this.getStaticField(bankItemPriceTableId, keyTuple, 1, bankItemPriceFieldLayout).catch(
        () => zero,
      ),
      this.getStaticField(bankItemPriceTableId, keyTuple, 2, bankItemPriceFieldLayout).catch(
        () => zero,
      ),
      this.getStaticField(bankItemPriceTableId, keyTuple, 3, bankItemPriceFieldLayout).catch(
        () => zero,
      ),
      this.getStaticField(bankItemPriceTableId, keyTuple, 4, bankItemPriceFieldLayout).catch(
        () => zero,
      ),
      this.getStaticField(bankItemPriceTableId, keyTuple, 5, bankItemPriceFieldLayout).catch(
        () => zero,
      ),
      this.getStaticField(bankItemPriceTableId, keyTuple, 6, bankItemPriceFieldLayout).catch(
        () => zero,
      ),
      this.getStaticField(
        bankItemInventoryTableId,
        keyTuple,
        0,
        bankItemInventoryFieldLayout,
      ).catch(() => zero),
    ]);

    return {
      itemId,
      inventoryQuantity: decodeUint32StaticField(inventoryQuantityBlob),
      buyPrice: decodeUint256StaticField(buyPriceBlob),
      sellPrice: decodeUint256StaticField(sellPriceBlob),
      buyMaxQuantity: decodeUint32StaticField(buyMaxQuantityBlob),
      sellMaxQuantity: decodeUint32StaticField(sellMaxQuantityBlob),
      validUntil: decodeUint64StaticField(validUntilBlob),
      epoch: decodeUint32StaticField(epochBlob),
      priceExists: decodeBoolStaticField(priceExistsBlob),
    };
  }

  async getBankItemQuotes(itemIds: string[]): Promise<BankItemQuoteSnapshot[]> {
    return Promise.all(itemIds.map((itemId) => this.getBankItemQuote(itemId)));
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

  async runForageExpedition(
    options: ForageExpeditionOptions = {},
  ): Promise<ForageExpeditionResult> {
    const radius = clampInteger(options.radius ?? 5, 1, 8);
    const maxForages = clampInteger(options.maxForages ?? 4, 1, 10);
    const maxMoveStepsPerTarget = clampInteger(options.maxMoveStepsPerTarget ?? 8, 1, 16);
    const minEnergy = clampInteger(options.minEnergy ?? 20, 0, 10_000);
    const sleepWhenLowEnergy = options.sleepWhenLowEnergy ?? true;
    const spawnIfMissing = options.spawnIfMissing ?? true;
    const actions: string[] = [];
    const forages: ForageExpeditionResult['forages'] = [];
    let tilesConsidered = 0;
    let player = await this.getPlayer();

    try {
      if (!player) {
        if (!spawnIfMissing) {
          return {
            status: 'blocked',
            summary: 'Player does not exist yet.',
            actions,
            forages,
            tilesConsidered,
          };
        }

        const spawned = await this.spawn();
        actions.push(`spawn(${defaultSpawnX},${defaultSpawnY})`);
        player = spawned.player;

        return {
          status: 'spawned',
          summary: 'Spawned player; run another expedition after state is indexed.',
          actions,
          forages,
          tilesConsidered,
          player,
        };
      }

      const pending = await this.resolveReadyPendingAction(player, actions);
      if (pending.status === 'pending-action') {
        return {
          status: 'pending-action',
          summary: pending.summary,
          actions,
          forages,
          tilesConsidered,
          player: pending.player,
        };
      }
      player = pending.player;

      for (let forageCount = 0; forageCount < maxForages; forageCount += 1) {
        if (player.energy <= minEnergy) {
          return await this.finishLowEnergyExpedition({
            player,
            actions,
            forages,
            tilesConsidered,
            sleepWhenLowEnergy,
            minEnergy,
          });
        }

        const tiles = await this.scanNearby(radius);
        tilesConsidered += tiles.length;
        const target = chooseForageTarget(player, tiles, maxMoveStepsPerTarget);

        if (!target) {
          return {
            status: forages.length > 0 ? 'completed' : 'no-targets',
            summary:
              forages.length > 0
                ? `Foraged ${forages.length} tile(s); no more reachable productive targets.`
                : 'No reachable productive forage targets found nearby.',
            actions,
            forages,
            tilesConsidered,
            player,
          };
        }

        if (target.path.length > 0) {
          await this.movePath(target.path);
          actions.push(
            `movePath(${target.path.map((step) => `${step.x},${step.y}`).join(' -> ')})`,
          );
          player = await this.requirePlayer();
        }

        const forage = await this.forage(target.tile.x, target.tile.y);
        const itemId = forage.result.itemId;
        const amount = Number(forage.result.amount);
        actions.push(`forage(${target.tile.x},${target.tile.y})=${amount} ${itemId}`);
        forages.push({
          x: target.tile.x,
          y: target.tile.y,
          terrainId: target.tile.terrainId,
          itemId,
          amount,
        });
        player = forage.player ?? (await this.requirePlayer());
      }

      return {
        status: 'completed',
        summary: `Foraged ${forages.length} tile(s) in one batched expedition.`,
        actions,
        forages,
        tilesConsidered,
        player,
      };
    } catch (error) {
      return {
        status: 'blocked',
        summary: `Expedition stopped: ${formatError(error)}`,
        actions,
        forages,
        tilesConsidered,
        player: await this.getPlayer(),
        error: formatError(error),
      };
    }
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

  private async resolveReadyPendingAction(
    player: PlayerSnapshot,
    actions: string[],
  ): Promise<
    | { status: 'ready' | 'none'; player: PlayerSnapshot }
    | { status: 'pending-action'; player: PlayerSnapshot; summary: string }
  > {
    if (!player.pendingAction) {
      return { status: 'none', player };
    }

    if (player.pendingAction.readyAt <= nowSeconds()) {
      await this.resolveAction();
      actions.push(`resolveAction(${player.pendingAction.action})`);

      return { status: 'ready', player: await this.requirePlayer() };
    }

    return {
      status: 'pending-action',
      player,
      summary: `${player.pendingAction.action} is pending until ${player.pendingAction.readyAt}.`,
    };
  }

  private async finishLowEnergyExpedition({
    player,
    actions,
    forages,
    tilesConsidered,
    sleepWhenLowEnergy,
    minEnergy,
  }: {
    player: PlayerSnapshot;
    actions: string[];
    forages: ForageExpeditionResult['forages'];
    tilesConsidered: number;
    sleepWhenLowEnergy: boolean;
    minEnergy: number;
  }): Promise<ForageExpeditionResult> {
    if (!sleepWhenLowEnergy || player.pendingAction) {
      return {
        status: 'low-energy',
        summary: `Energy ${player.energy} is at or below minimum ${minEnergy}.`,
        actions,
        forages,
        tilesConsidered,
        player,
      };
    }

    await this.sleep();
    actions.push('sleep()');

    return {
      status: 'low-energy',
      summary: `Energy ${player.energy} is low; started sleep after ${forages.length} forage(s).`,
      actions,
      forages,
      tilesConsidered,
      player: await this.getPlayer(),
    };
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

function chooseForageTarget(
  player: PlayerSnapshot,
  tiles: TerrainTileSnapshot[],
  maxMoveSteps: number,
): { tile: TerrainTileSnapshot; path: Array<{ x: number; y: number }> } | undefined {
  return tiles
    .filter((tile) => tile.forageable && !tile.recovering && tile.expectedAmount > 0)
    .map((tile) => {
      const path = makePathIntoForageRange(player, tile, maxMoveSteps);

      return path ? { tile, path } : undefined;
    })
    .filter((target): target is { tile: TerrainTileSnapshot; path: Array<{ x: number; y: number }> } =>
      Boolean(target),
    )
    .sort((a, b) => {
      const expectedDelta = b.tile.expectedAmount - a.tile.expectedAmount;
      if (expectedDelta !== 0) return expectedDelta;

      return a.path.length - b.path.length;
    })[0];
}

function makePathIntoForageRange(
  player: PlayerSnapshot,
  tile: TerrainTileSnapshot,
  maxMoveSteps: number,
): Array<{ x: number; y: number }> | undefined {
  const distance = manhattanDistance(player.x, player.y, tile.x, tile.y);

  if (distance <= 1) {
    return [];
  }

  const endpoints = [
    { x: tile.x, y: tile.y },
    { x: tile.x + 1, y: tile.y },
    { x: tile.x - 1, y: tile.y },
    { x: tile.x, y: tile.y + 1 },
    { x: tile.x, y: tile.y - 1 },
  ]
    .map((endpoint) => ({
      endpoint,
      distance: manhattanDistance(player.x, player.y, endpoint.x, endpoint.y),
    }))
    .sort((a, b) => a.distance - b.distance);

  for (const { endpoint } of endpoints) {
    const path = makeManhattanPath(player.x, player.y, endpoint.x, endpoint.y, maxMoveSteps);
    const lastStep = path[path.length - 1] ?? { x: player.x, y: player.y };

    if (manhattanDistance(lastStep.x, lastStep.y, tile.x, tile.y) <= 1) {
      return path;
    }
  }

  return undefined;
}

function manhattanDistance(startX: number, startY: number, targetX: number, targetY: number): number {
  return Math.abs(startX - targetX) + Math.abs(startY - targetY);
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;

  return Math.max(min, Math.min(max, Math.trunc(value)));
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

function decodeUint256StaticField(blob: Hex): bigint {
  return BigInt(blob);
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

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function bytes32(value: string): Hex {
  return stringToHex(value, { size: 32 });
}
