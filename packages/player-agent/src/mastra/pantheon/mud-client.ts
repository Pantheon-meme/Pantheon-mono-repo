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
    name: 'pantheon__plant',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'x', type: 'int32' },
      { name: 'y', type: 'int32' },
      { name: 'plantId', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'pantheon__harvest',
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
    name: 'pantheon__pickupObject',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'objectId', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'pantheon__sellObjectsToBank',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'objectIds', type: 'bytes32[]' }],
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
    name: 'pantheon__getLastHarvestResult',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [
      { name: 'x', type: 'int32' },
      { name: 'y', type: 'int32' },
      { name: 'itemId', type: 'bytes32' },
      { name: 'amount', type: 'uint32' },
      { name: 'rareItemId', type: 'bytes32' },
      { name: 'rareAmount', type: 'uint32' },
      { name: 'exists', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'pantheon__getWorldObjectCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'count', type: 'uint32' }],
  },
  {
    type: 'function',
    name: 'pantheon__getWorldObject',
    stateMutability: 'view',
    inputs: [{ name: 'index', type: 'uint32' }],
    outputs: [
      { name: 'objectId', type: 'bytes32' },
      { name: 'x', type: 'int32' },
      { name: 'y', type: 'int32' },
      { name: 'itemId', type: 'bytes32' },
      { name: 'amount', type: 'uint32' },
      { name: 'spawnedBy', type: 'address' },
      { name: 'createdAt', type: 'uint64' },
      { name: 'exists', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'pantheon__getPlayerInventory',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [
      { name: 'maxWeight', type: 'uint32' },
      { name: 'slots', type: 'uint8[]' },
      { name: 'objectIds', type: 'bytes32[]' },
      { name: 'objectTypeIds', type: 'bytes32[]' },
      { name: 'itemIds', type: 'bytes32[]' },
      { name: 'amounts', type: 'uint32[]' },
      { name: 'weights', type: 'uint32[]' },
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
const cucBalanceTableId =
  '0x746270616e7468656f6e00000000000043756342616c616e6365000000000000';
const cucBalanceFieldLayout =
  '0x0021020020010000000000000000000000000000000000000000000000000000';
const plantStateTableId =
  '0x746270616e7468656f6e000000000000506c616e745374617465000000000000';
const plantStateFieldLayout =
  '0x004e080020140801040408010000000000000000000000000000000000000000';
const farmTileStateTableId =
  '0x746270616e7468656f6e0000000000004661726d54696c655374617465000000';
const farmTileStateFieldLayout =
  '0x001d060004040408080100000000000000000000000000000000000000000000';
const zeroBytes32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex;
const centralBankX = 100;
const centralBankY = 100;
const centralBankWidth = 5;
const centralBankHeight = 5;
const forageEnergyCost = 10;
const plantEnergyCost = 8;
const harvestEnergyCost = 6;
const plantStageHarvested = 2;

export type PantheonMudClientEnvOptions = {
  privateKeyEnv?: string;
};

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

export type InventorySlotSnapshot = {
  slot: number;
  objectId: Hex;
  objectTypeId: string;
  itemId: string;
  amount: number;
  weight: number;
};

export type PlayerInventorySnapshot = {
  maxWeight: number;
  usedWeight: number;
  slots: InventorySlotSnapshot[];
};

export type WorldObjectSnapshot = {
  objectId: Hex;
  x: number;
  y: number;
  itemId: string;
  amount: number;
  spawnedBy: Hex;
  createdAt: number;
  exists: boolean;
};

export type PlantSnapshot = {
  x: number;
  y: number;
  plantId: string;
  plantedAt: number;
  stage: number;
  health: number;
  stress: number;
  exists: boolean;
  ready: boolean;
};

export type ForageExpeditionOptions = {
  radius?: number;
  maxForages?: number;
  maxMoveStepsPerTarget?: number;
  minEnergy?: number;
  sleepWhenLowEnergy?: boolean;
  spawnIfMissing?: boolean;
};

export type EconomicCycleOptions = ForageExpeditionOptions & {
  maxPickups?: number;
  worldObjectLookback?: number;
  sellWhenValueAtLeast?: number;
  sellWhenWeightRatioAtLeast?: number;
  plantWhenSeedsAvailable?: boolean;
  harvestRadius?: number;
  useLlmStrategyHint?: string;
};

export type EconomicCycleResult = ForageExpeditionResult & {
  mode: 'economic-cycle';
  decision: string;
  inventory?: PlayerInventorySnapshot;
  cucBalance?: string;
  sale?: {
    objectIds: Hex[];
    itemIds: string[];
    estimatedCuc: string;
    hash?: Hex;
  };
  pickups: WorldObjectSnapshot[];
  farm?: {
    action: 'plant' | 'harvest';
    x: number;
    y: number;
    plantId?: string;
    itemId?: string;
    amount?: number;
    hash?: Hex;
  };
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

const seedToPlantId = new Map<string, string>([
  ['sungrain_seed', 'sungrain'],
  ['emberwheat_seed', 'emberwheat'],
  ['frostbarley_seed', 'frostbarley'],
  ['duskmillet_seed', 'duskmillet'],
  ['starrye_seed', 'starrye'],
  ['silveroat_seed', 'silveroat'],
  ['poolblossom_seed', 'poolblossom'],
  ['liquidity_reed_seed', 'liquidity-reed'],
  ['routeberry_seed', 'routeberry'],
  ['city_clover_seed', 'city-clover'],
  ['swamp_orchid_seed', 'swamp-orchid'],
  ['mirror_reed_seed', 'mirror-reed'],
  ['applewood_seed', 'applewood'],
  ['pinecrest_seed', 'pinecrest'],
  ['honeyfig_seed', 'honeyfig'],
  ['unicornwillow_seed', 'unicornwillow'],
  ['moonwillow_seed', 'moonwillow'],
  ['poolcypress_seed', 'poolcypress'],
  ['stonepine_seed', 'stonepine'],
]);

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

  static fromEnv(options: PantheonMudClientEnvOptions = {}): PantheonMudClient {
    loadLocalEnvFiles();
    if (process.env.INIT_CWD) {
      loadLocalEnvFiles(process.env.INIT_CWD);
    }

    const privateKeyOverride = options.privateKeyEnv
      ? process.env[options.privateKeyEnv]
      : undefined;

    return new PantheonMudClient(
      process.env.MUD_RPC_URL ??
        process.env.VITE_MUD_RPC_URL ??
        defaultRpcUrl,
      (process.env.MUD_WORLD_ADDRESS ??
        process.env.VITE_MUD_WORLD_ADDRESS ??
        defaultWorldAddress) as Hex,
      (privateKeyOverride ??
        process.env.MUD_PRIVATE_KEY ??
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

  async plant(x: number, y: number, plantId: string) {
    const hash = await this.walletClient.writeContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: 'pantheon__plant',
      args: [x, y, bytes32(plantId)],
      chain: foundry,
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    return { hash, player: await this.getPlayer() };
  }

  async harvest(x: number, y: number) {
    const hash = await this.walletClient.writeContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: 'pantheon__harvest',
      args: [x, y],
      chain: foundry,
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    const [resultX, resultY, itemId, amount, rareItemId, rareAmount, exists] =
      await this.publicClient.readContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: 'pantheon__getLastHarvestResult',
        args: [this.walletClient.account.address],
      });

    return {
      hash,
      result: {
        x: resultX,
        y: resultY,
        itemId: decodeBytes32String(itemId),
        amount,
        rareItemId: decodeBytes32String(rareItemId),
        rareAmount,
        exists,
      },
      player: await this.getPlayer(),
    };
  }

  async pickupObject(objectId: Hex) {
    const hash = await this.walletClient.writeContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: 'pantheon__pickupObject',
      args: [objectId],
      chain: foundry,
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    return { hash, inventory: await this.getPlayerInventory(), player: await this.getPlayer() };
  }

  async sellObjectsToBank(objectIds: Hex[]) {
    const hash = await this.walletClient.writeContract({
      address: this.worldAddress,
      abi: pantheonWorldAbi,
      functionName: 'pantheon__sellObjectsToBank',
      args: [objectIds],
      chain: foundry,
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    return {
      hash,
      inventory: await this.getPlayerInventory(),
      cucBalance: await this.getCucBalance(),
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

  async getCucBalance(): Promise<bigint> {
    return decodeUint256StaticField(
      await this.getStaticField(
        cucBalanceTableId,
        [addressToBytes32(this.walletClient.account.address)],
        0,
        cucBalanceFieldLayout,
      ).catch(() => zeroBytes32),
    );
  }

  async getChainTimestamp(): Promise<number> {
    const block = await this.publicClient.getBlock();

    return Number(block.timestamp);
  }

  async getPlayerInventory(): Promise<PlayerInventorySnapshot> {
    const [maxWeight, slots, objectIds, objectTypeIds, itemIds, amounts, weights] =
      await this.publicClient.readContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: 'pantheon__getPlayerInventory',
        args: [this.walletClient.account.address],
      });
    const inventorySlots = slots.map((slot, index) => ({
      slot,
      objectId: objectIds[index],
      objectTypeId: decodeBytes32String(objectTypeIds[index]),
      itemId: decodeBytes32String(itemIds[index]),
      amount: Number(amounts[index]),
      weight: Number(weights[index]),
    }));

    return {
      maxWeight: Number(maxWeight),
      usedWeight: inventorySlots.reduce((total, slot) => total + slot.weight, 0),
      slots: inventorySlots,
    };
  }

  async getRecentWorldObjects(lookback: number): Promise<WorldObjectSnapshot[]> {
    const count = Number(
      await this.publicClient.readContract({
        address: this.worldAddress,
        abi: pantheonWorldAbi,
        functionName: 'pantheon__getWorldObjectCount',
        args: [],
      }),
    );
    const start = Math.max(1, count - Math.max(1, lookback) + 1);
    const objects: WorldObjectSnapshot[] = [];

    for (let index = count; index >= start; index -= 1) {
      const [objectId, x, y, itemId, amount, spawnedBy, createdAt, exists] =
        await this.publicClient.readContract({
          address: this.worldAddress,
          abi: pantheonWorldAbi,
          functionName: 'pantheon__getWorldObject',
          args: [index],
        });

      if (!exists) continue;

      objects.push({
        objectId,
        x,
        y,
        itemId: decodeBytes32String(itemId),
        amount: Number(amount),
        spawnedBy,
        createdAt: Number(createdAt),
        exists,
      });
    }

    return objects;
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

  async runEconomicCycle(
    options: EconomicCycleOptions = {},
  ): Promise<EconomicCycleResult> {
    const radius = clampInteger(options.radius ?? 5, 1, 8);
    const maxPickups = clampInteger(options.maxPickups ?? 4, 0, 12);
    const worldObjectLookback = clampInteger(options.worldObjectLookback ?? 80, 1, 400);
    const sellWhenValueAtLeast = clampInteger(options.sellWhenValueAtLeast ?? 48, 0, 100_000);
    const sellWhenWeightRatioAtLeast = clampNumber(options.sellWhenWeightRatioAtLeast ?? 0.75, 0, 1);
    const plantWhenSeedsAvailable = options.plantWhenSeedsAvailable ?? true;
    const harvestRadius = clampInteger(options.harvestRadius ?? 5, 1, 8);
    const actions: string[] = [];
    const pickups: WorldObjectSnapshot[] = [];
    let player = await this.getPlayer();

    try {
      if (!player) {
        if (options.spawnIfMissing === false) {
          return this.emptyEconomicResult('blocked', 'Player does not exist yet.', actions, pickups);
        }

        const spawned = await this.spawn();
        actions.push(`spawn(${defaultSpawnX},${defaultSpawnY})`);

        return {
          ...this.emptyEconomicResult(
            'spawned',
            'Spawned player; run another cycle after state is indexed.',
            actions,
            pickups,
          ),
          player: spawned.player,
        };
      }

      const pending = await this.resolveReadyPendingAction(player, actions);
      if (pending.status === 'pending-action') {
        return {
          ...this.emptyEconomicResult('pending-action', pending.summary, actions, pickups),
          player: pending.player,
          inventory: await this.getPlayerInventory().catch(() => undefined),
          cucBalance: (await this.getCucBalance().catch(() => undefined))?.toString(),
        };
      }
      player = pending.player;

      const inventoryBefore = await this.getPlayerInventory();
      const sellPlanBeforePickup = await this.planSale(inventoryBefore);
      const weightRatioBefore =
        inventoryBefore.maxWeight > 0 ? inventoryBefore.usedWeight / inventoryBefore.maxWeight : 1;
      const minEnergy = options.minEnergy ?? 20;

      if (
        sellPlanBeforePickup.objectIds.length > 0 &&
        (sellPlanBeforePickup.estimatedCuc >= BigInt(sellWhenValueAtLeast) ||
          weightRatioBefore >= sellWhenWeightRatioAtLeast)
      ) {
        return await this.finishSaleCycle({
          reason: 'selling inventory before gathering more',
          player,
          actions,
          pickups,
          salePlan: sellPlanBeforePickup,
        });
      }

      if (player.energy <= minEnergy) {
        const lowEnergy = await this.finishLowEnergyExpedition({
          player,
          actions,
          forages: [],
          tilesConsidered: 0,
          sleepWhenLowEnergy: options.sleepWhenLowEnergy ?? true,
          minEnergy,
        });

        return {
          ...lowEnergy,
          mode: 'economic-cycle',
          decision:
            inventoryBefore.usedWeight >= inventoryBefore.maxWeight
              ? 'sleep-low-energy-inventory-full'
              : 'sleep-low-energy',
          inventory: inventoryBefore,
          cucBalance: (await this.getCucBalance().catch(() => undefined))?.toString(),
          pickups,
        };
      }

      if (
        inventoryBefore.usedWeight >= inventoryBefore.maxWeight &&
        sellPlanBeforePickup.objectIds.length === 0
      ) {
        return {
          ...this.emptyEconomicResult(
            'blocked',
            'Inventory is full, but no currently carried object has a fresh bank buy price.',
            actions,
            pickups,
          ),
          decision: 'inventory-full-no-sellable-items',
          player,
          inventory: inventoryBefore,
          cucBalance: (await this.getCucBalance().catch(() => undefined))?.toString(),
        };
      }

      if (plantWhenSeedsAvailable && player.energy > plantEnergyCost + harvestEnergyCost) {
        const harvest = await this.tryHarvestReadyPlant(player, actions, harvestRadius);

        if (harvest) {
          return {
            ...this.emptyEconomicResult(
              'completed',
              `Harvested ${harvest.amount} ${harvest.itemId}.`,
              actions,
              pickups,
            ),
            decision: 'harvest-ready-plant',
            player: await this.getPlayer(),
            inventory: await this.getPlayerInventory().catch(() => inventoryBefore),
            cucBalance: (await this.getCucBalance().catch(() => undefined))?.toString(),
            farm: harvest,
          };
        }

        const plant = await this.tryPlantSeed(player, inventoryBefore, actions, radius);

        if (plant) {
          return {
            ...this.emptyEconomicResult(
              'completed',
              `Planted ${plant.plantId} at ${plant.x},${plant.y}.`,
              actions,
              pickups,
            ),
            decision: 'plant-seed-compounding',
            player: await this.getPlayer(),
            inventory: await this.getPlayerInventory().catch(() => inventoryBefore),
            cucBalance: (await this.getCucBalance().catch(() => undefined))?.toString(),
            farm: plant,
          };
        }
      }

      const nearbyObjects = await this.findOwnedNearbyObjects(player, worldObjectLookback, radius);
      let inventory = inventoryBefore;

      for (const object of nearbyObjects.slice(0, maxPickups)) {
        if (inventory.usedWeight + 1 > inventory.maxWeight) break;

        const path = makePathIntoRange(player, object.x, object.y, options.maxMoveStepsPerTarget ?? 8);
        if (!path) continue;

        if (path.length > 0) {
          await this.movePath(path);
          actions.push(`movePath(${path.map((step) => `${step.x},${step.y}`).join(' -> ')})`);
          player = await this.requirePlayer();
        }

        await this.pickupObject(object.objectId);
        actions.push(`pickup(${object.itemId}@${object.x},${object.y})`);
        pickups.push(object);
        inventory = await this.getPlayerInventory();
      }

      const salePlan = await this.planSale(inventory);
      const weightRatio = inventory.maxWeight > 0 ? inventory.usedWeight / inventory.maxWeight : 1;

      if (
        salePlan.objectIds.length > 0 &&
        (salePlan.estimatedCuc >= BigInt(sellWhenValueAtLeast) ||
          weightRatio >= sellWhenWeightRatioAtLeast)
      ) {
        return await this.finishSaleCycle({
          reason: pickups.length > 0 ? 'selling after pickup batch' : 'selling valuable inventory',
          player,
          actions,
          pickups,
          salePlan,
        });
      }

      if (player.energy <= minEnergy) {
        const lowEnergy = await this.finishLowEnergyExpedition({
          player,
          actions,
          forages: [],
          tilesConsidered: 0,
          sleepWhenLowEnergy: options.sleepWhenLowEnergy ?? true,
          minEnergy,
        });

        return {
          ...lowEnergy,
          mode: 'economic-cycle',
          decision: 'sleep-low-energy',
          inventory,
          cucBalance: (await this.getCucBalance().catch(() => undefined))?.toString(),
          pickups,
        };
      }

      const expedition = await this.runForageExpedition({
        ...options,
        radius,
        spawnIfMissing: false,
      });

      return {
        ...expedition,
        mode: 'economic-cycle',
        decision:
          pickups.length > 0
            ? 'picked-up-nearby-drops-then-foraged'
            : 'forage-for-future-pickup-and-sale',
        inventory: await this.getPlayerInventory().catch(() => inventory),
        cucBalance: (await this.getCucBalance().catch(() => undefined))?.toString(),
        pickups,
      };
    } catch (error) {
      return {
        ...this.emptyEconomicResult(
          'blocked',
          `Economic cycle stopped: ${formatError(error)}`,
          actions,
          pickups,
        ),
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

  private async getPlant(x: number, y: number): Promise<PlantSnapshot | undefined> {
    const keyTuple = [int32ToBytes32(x), int32ToBytes32(y)];

    try {
      const [plantBlob, plantedAtBlob, stageBlob, healthBlob, stressBlob, existsBlob] =
        await Promise.all([
          this.getStaticField(plantStateTableId, keyTuple, 0, plantStateFieldLayout),
          this.getStaticField(plantStateTableId, keyTuple, 2, plantStateFieldLayout),
          this.getStaticField(plantStateTableId, keyTuple, 3, plantStateFieldLayout),
          this.getStaticField(plantStateTableId, keyTuple, 4, plantStateFieldLayout),
          this.getStaticField(plantStateTableId, keyTuple, 5, plantStateFieldLayout),
          this.getStaticField(plantStateTableId, keyTuple, 7, plantStateFieldLayout),
        ]);

      if (!decodeBoolStaticField(existsBlob)) {
        return undefined;
      }

      const plantId = decodeBytes32String(plantBlob);
      const plantedAt = decodeUint64StaticField(plantedAtBlob);
      const stage = decodeUint8StaticField(stageBlob);

      return {
        x,
        y,
        plantId,
        plantedAt,
        stage,
        health: decodeUint32StaticField(healthBlob),
        stress: decodeUint32StaticField(stressBlob),
        exists: true,
        ready: stage !== plantStageHarvested && nowSeconds() - plantedAt >= guessedGrowthSeconds(plantId),
      };
    } catch {
      return undefined;
    }
  }

  private async getFarmTileExists(x: number, y: number): Promise<boolean> {
    return decodeBoolStaticField(
      await this.getStaticField(
        farmTileStateTableId,
        [int32ToBytes32(x), int32ToBytes32(y)],
        5,
        farmTileStateFieldLayout,
      ).catch(() => zeroBytes32),
    );
  }

  private async findOwnedNearbyObjects(
    player: PlayerSnapshot,
    lookback: number,
    radius: number,
  ): Promise<WorldObjectSnapshot[]> {
    const objects = await this.getRecentWorldObjects(lookback);
    const quotes = new Map<string, BankItemQuoteSnapshot>();

    return (
      await Promise.all(
        objects
          .filter(
            (object) =>
              object.spawnedBy.toLowerCase() === player.address.toLowerCase() &&
              manhattanDistance(player.x, player.y, object.x, object.y) <= radius,
          )
          .map(async (object) => {
            const quote =
              quotes.get(object.itemId) ??
              (await this.getBankItemQuote(object.itemId).catch(() => undefined));
            if (quote) quotes.set(object.itemId, quote);

            const estimatedValue = quote?.priceExists ? quote.buyPrice * BigInt(object.amount) : 0n;

            return { object, estimatedValue };
          }),
      )
    )
      .filter(({ estimatedValue }) => estimatedValue > 0n)
      .sort((a, b) => Number(b.estimatedValue - a.estimatedValue))
      .map(({ object }) => object);
  }

  private async planSale(inventory: PlayerInventorySnapshot): Promise<{
    objectIds: Hex[];
    itemIds: string[];
    estimatedCuc: bigint;
  }> {
    const priced = await Promise.all(
      inventory.slots.map(async (slot) => {
        const quote = await this.getBankItemQuote(slot.itemId).catch(() => undefined);
        const estimatedCuc = quote?.priceExists ? quote.buyPrice * BigInt(slot.amount) : 0n;

        return { slot, quote, estimatedCuc };
      }),
    );

    const sellable = priced.filter(
      ({ quote, estimatedCuc }) =>
        quote?.priceExists && quote.buyPrice > 0n && estimatedCuc > 0n,
    );

    return {
      objectIds: sellable.map(({ slot }) => slot.objectId),
      itemIds: sellable.map(({ slot }) => slot.itemId),
      estimatedCuc: sellable.reduce((total, item) => total + item.estimatedCuc, 0n),
    };
  }

  private async finishSaleCycle({
    reason,
    player,
    actions,
    pickups,
    salePlan,
  }: {
    reason: string;
    player: PlayerSnapshot;
    actions: string[];
    pickups: WorldObjectSnapshot[];
    salePlan: { objectIds: Hex[]; itemIds: string[]; estimatedCuc: bigint };
  }): Promise<EconomicCycleResult> {
    const path = pathToBank(player, 24);
    let currentPlayer = player;

    if (path.length > 0) {
      await this.movePath(path);
      actions.push(`movePath(${path.map((step) => `${step.x},${step.y}`).join(' -> ')})`);
      currentPlayer = await this.requirePlayer();
    }

    if (!isNearBank(currentPlayer.x, currentPlayer.y)) {
      return {
        ...this.emptyEconomicResult(
          'completed',
          `Moving toward bank with ${salePlan.objectIds.length} sellable object(s); sale deferred until in range.`,
          actions,
          pickups,
        ),
        decision: `${reason}: travel-to-bank`,
        player: currentPlayer,
        inventory: await this.getPlayerInventory().catch(() => undefined),
        cucBalance: (await this.getCucBalance().catch(() => undefined))?.toString(),
        sale: {
          objectIds: salePlan.objectIds,
          itemIds: salePlan.itemIds,
          estimatedCuc: salePlan.estimatedCuc.toString(),
        },
      };
    }

    const sale = await this.sellObjectsToBank(salePlan.objectIds);
    actions.push(`sell(${salePlan.itemIds.join(',')})=${salePlan.estimatedCuc.toString()} CUC`);

    return {
      ...this.emptyEconomicResult(
        'completed',
        `Sold ${salePlan.objectIds.length} object(s) for about ${salePlan.estimatedCuc.toString()} CUC.`,
        actions,
        pickups,
      ),
      decision: reason,
      player: sale.player,
      inventory: sale.inventory,
      cucBalance: sale.cucBalance.toString(),
      sale: {
        objectIds: salePlan.objectIds,
        itemIds: salePlan.itemIds,
        estimatedCuc: salePlan.estimatedCuc.toString(),
        hash: sale.hash,
      },
    };
  }

  private async tryHarvestReadyPlant(
    player: PlayerSnapshot,
    actions: string[],
    radius: number,
  ): Promise<EconomicCycleResult['farm'] | undefined> {
    for (let y = player.y - radius; y <= player.y + radius; y += 1) {
      for (let x = player.x - radius; x <= player.x + radius; x += 1) {
        const plant = await this.getPlant(x, y);

        if (!plant?.ready) continue;

        const path = makePathIntoRange(player, x, y, 12);
        if (!path) continue;

        if (path.length > 0) {
          await this.movePath(path);
          actions.push(`movePath(${path.map((step) => `${step.x},${step.y}`).join(' -> ')})`);
        }

        const harvest = await this.harvest(x, y);
        actions.push(`harvest(${x},${y})=${harvest.result.amount} ${harvest.result.itemId}`);

        return {
          action: 'harvest',
          x,
          y,
          itemId: harvest.result.itemId,
          amount: Number(harvest.result.amount),
          hash: harvest.hash,
        };
      }
    }

    return undefined;
  }

  private async tryPlantSeed(
    player: PlayerSnapshot,
    inventory: PlayerInventorySnapshot,
    actions: string[],
    radius: number,
  ): Promise<EconomicCycleResult['farm'] | undefined> {
    const seed = inventory.slots.find((slot) => seedToPlantId.has(slot.itemId));
    const plantId = seed ? seedToPlantId.get(seed.itemId) : undefined;

    if (!seed || !plantId) return undefined;

    const tiles = await this.scanNearby(radius);
    const target = tiles.find(
      (tile) =>
        tile.terrainId === 'dirt' &&
        manhattanDistance(player.x, player.y, tile.x, tile.y) <= 4,
    );

    if (!target) return undefined;
    if (await this.getPlant(target.x, target.y)) return undefined;
    await this.getFarmTileExists(target.x, target.y).catch(() => false);

    const path = makePathIntoRange(player, target.x, target.y, 8);
    if (!path) return undefined;

    if (path.length > 0) {
      await this.movePath(path);
      actions.push(`movePath(${path.map((step) => `${step.x},${step.y}`).join(' -> ')})`);
    }

    const planted = await this.plant(target.x, target.y, plantId);
    actions.push(`plant(${plantId}@${target.x},${target.y})`);

    return {
      action: 'plant',
      x: target.x,
      y: target.y,
      plantId,
      hash: planted.hash,
    };
  }

  private emptyEconomicResult(
    status: ForageExpeditionResult['status'],
    summary: string,
    actions: string[],
    pickups: WorldObjectSnapshot[],
  ): EconomicCycleResult {
    return {
      mode: 'economic-cycle',
      decision: 'none',
      status,
      summary,
      actions,
      forages: [],
      tilesConsidered: 0,
      pickups,
    };
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

export function makePantheonMudClient(
  options: PantheonMudClientEnvOptions = {},
): PantheonMudClient {
  return PantheonMudClient.fromEnv(options);
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

function makePathIntoRange(
  player: PlayerSnapshot,
  targetX: number,
  targetY: number,
  maxMoveSteps: number,
): Array<{ x: number; y: number }> | undefined {
  const distance = manhattanDistance(player.x, player.y, targetX, targetY);

  if (distance <= 1) {
    return [];
  }

  const endpoints = [
    { x: targetX, y: targetY },
    { x: targetX + 1, y: targetY },
    { x: targetX - 1, y: targetY },
    { x: targetX, y: targetY + 1 },
    { x: targetX, y: targetY - 1 },
  ]
    .map((endpoint) => ({
      endpoint,
      distance: manhattanDistance(player.x, player.y, endpoint.x, endpoint.y),
    }))
    .sort((a, b) => a.distance - b.distance);

  for (const { endpoint } of endpoints) {
    const path = makeManhattanPath(player.x, player.y, endpoint.x, endpoint.y, maxMoveSteps);
    const lastStep = path[path.length - 1] ?? { x: player.x, y: player.y };

    if (manhattanDistance(lastStep.x, lastStep.y, targetX, targetY) <= 1) {
      return path;
    }
  }

  return undefined;
}

function pathToBank(player: PlayerSnapshot, maxSteps: number): Array<{ x: number; y: number }> {
  if (isNearBank(player.x, player.y)) {
    return [];
  }

  const target = {
    x: centralBankX + Math.floor(centralBankWidth / 2),
    y: centralBankY + Math.floor(centralBankHeight / 2),
  };

  return makeManhattanPath(player.x, player.y, target.x, target.y, maxSteps);
}

function inventoryHasFreeWeight(inventory: PlayerInventorySnapshot): boolean {
  return inventory.maxWeight <= 0 || inventory.usedWeight + 1 <= inventory.maxWeight;
}

function isNearBank(x: number, y: number): boolean {
  return (
    x >= centralBankX - 1 &&
    x <= centralBankX + centralBankWidth &&
    y >= centralBankY - 1 &&
    y <= centralBankY + centralBankHeight
  );
}

function manhattanDistance(startX: number, startY: number, targetX: number, targetY: number): number {
  return Math.abs(startX - targetX) + Math.abs(startY - targetY);
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;

  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;

  return Math.max(min, Math.min(max, value));
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

function decodeUint8StaticField(blob: Hex): number {
  return Number.parseInt(blob.slice(2, 4), 16);
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

function guessedGrowthSeconds(plantId: string): number {
  if (plantId.includes('tree') || plantId.includes('wood') || plantId.includes('willow')) {
    return 120;
  }

  if (plantId.includes('reed') || plantId.includes('orchid')) {
    return 52;
  }

  return 46;
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
