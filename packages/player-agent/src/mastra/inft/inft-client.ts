import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import { hasAgentPermission } from '../agent-capsules/agent-capsule';
import { loadLocalEnvFiles } from '../load-env';

const defaultRpcUrl = 'http://127.0.0.1:8545';
const defaultWorldAddress = '0xfDf868Ea710FfD8cd33b829c5AFf79eDd15EcD5f';
const defaultPrivateKey =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const pantheonAgentInftAbi = [
  {
    type: 'function',
    name: 'intelligentDataOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'dataDescription', type: 'string' },
          { name: 'dataHash', type: 'bytes32' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'update',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      {
        name: 'newData',
        type: 'tuple[]',
        components: [
          { name: 'dataDescription', type: 'string' },
          { name: 'dataHash', type: 'bytes32' },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'usageAuthorization',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'executor', type: 'address' },
    ],
    outputs: [
      { name: 'permissions', type: 'bytes' },
      { name: 'expiresAt', type: 'uint64' },
      { name: 'exists', type: 'bool' },
    ],
  },
] as const;

const agentRegistryAbi = [
  {
    type: 'function',
    name: 'pantheon__isAuthorized',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'executor', type: 'address' },
      { name: 'requiredBits', type: 'uint256' },
    ],
    outputs: [{ name: 'authorized', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'pantheon__appendMemory',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'encryptedDeltaURI', type: 'string' },
      { name: 'deltaHash', type: 'bytes32' },
      { name: 'action', type: 'bytes32' },
    ],
    outputs: [{ name: 'sequence', type: 'uint32' }],
  },
] as const;

export type InftUsageAuthorization = {
  permissions: Hex;
  permissionBits: bigint;
  expiresAt: bigint;
  exists: boolean;
  expired: boolean;
};

export type PantheonInftClientEnvOptions = {
  privateKeyEnv?: string;
};

export type AppendAgentMemoryInput = {
  encryptedDeltaURI: string;
  deltaHash: Hex;
  action: Hex;
};

export type IntelligentDataCommitment = {
  dataDescription: string;
  dataHash: Hex;
};

export class PantheonInftClient {
  private readonly publicClient;
  private readonly walletClient;

  constructor(
    private readonly rpcUrl: string,
    private readonly worldAddress: Address,
    private readonly inftAddress: Address,
    private readonly tokenId: bigint,
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

  static fromEnv(options: PantheonInftClientEnvOptions = {}): PantheonInftClient {
    loadLocalEnvFiles();
    if (process.env.INIT_CWD) {
      loadLocalEnvFiles(process.env.INIT_CWD);
    }

    const privateKeyOverride = options.privateKeyEnv
      ? process.env[options.privateKeyEnv]
      : undefined;

    const inftAddress = process.env.AGENT_INFT_ADDRESS;
    if (!inftAddress) {
      throw new Error('AGENT_INFT_ADDRESS is required for INFT runtime access');
    }

    const tokenId = process.env.AGENT_TOKEN_ID;
    if (!tokenId) {
      throw new Error('AGENT_TOKEN_ID is required for INFT runtime access');
    }

    return new PantheonInftClient(
      process.env.MUD_RPC_URL ??
        process.env.VITE_MUD_RPC_URL ??
        defaultRpcUrl,
      (process.env.MUD_WORLD_ADDRESS ??
        process.env.VITE_MUD_WORLD_ADDRESS ??
        defaultWorldAddress) as Address,
      inftAddress as Address,
      BigInt(tokenId),
      (privateKeyOverride ??
        process.env.AGENT_EXECUTOR_PRIVATE_KEY ??
        process.env.MUD_PRIVATE_KEY ??
        process.env.VITE_MUD_PRIVATE_KEY ??
        defaultPrivateKey) as Hex,
    );
  }

  get executorAddress(): Address {
    return this.walletClient.account.address;
  }

  get agentTokenId(): bigint {
    return this.tokenId;
  }

  async getUsageAuthorization(
    executor: Address = this.executorAddress,
  ): Promise<InftUsageAuthorization> {
    const [permissions, expiresAt, exists] =
      await this.publicClient.readContract({
        address: this.inftAddress,
        abi: pantheonAgentInftAbi,
        functionName: 'usageAuthorization',
        args: [this.tokenId, executor],
      });
    const permissionBits = decodePermissionBits(permissions);
    const now = BigInt(Math.floor(Date.now() / 1000));

    return {
      permissions,
      permissionBits,
      expiresAt,
      exists,
      expired: expiresAt !== 0n && now > expiresAt,
    };
  }

  async getIntelligentData(): Promise<IntelligentDataCommitment[]> {
    const data = await this.publicClient.readContract({
      address: this.inftAddress,
      abi: pantheonAgentInftAbi,
      functionName: 'intelligentDataOf',
      args: [this.tokenId],
    });

    return data.map((entry) => ({
      dataDescription: entry.dataDescription,
      dataHash: entry.dataHash,
    }));
  }

  async updateIntelligentData(
    data: IntelligentDataCommitment[],
  ): Promise<Hex> {
    const hash = await this.walletClient.writeContract({
      address: this.inftAddress,
      abi: pantheonAgentInftAbi,
      functionName: 'update',
      args: [this.tokenId, data],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async isMudAuthorized(
    requiredBits: bigint,
    executor: Address = this.executorAddress,
  ): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.worldAddress,
      abi: agentRegistryAbi,
      functionName: 'pantheon__isAuthorized',
      args: [this.tokenId, executor, requiredBits],
    });
  }

  async assertAuthorized(requiredBits: bigint): Promise<InftUsageAuthorization> {
    const authorization = await this.getUsageAuthorization();
    if (!authorization.exists) {
      throw new Error('INFT executor authorization is missing');
    }
    if (authorization.expired) {
      throw new Error('INFT executor authorization is expired');
    }
    if (!hasAgentPermission(authorization.permissionBits, requiredBits)) {
      throw new Error('INFT executor permission bit is missing');
    }
    if (!(await this.isMudAuthorized(requiredBits))) {
      throw new Error('MUD mirrored executor authorization is missing');
    }

    return authorization;
  }

  async appendMemory(input: AppendAgentMemoryInput): Promise<Hex> {
    const hash = await this.walletClient.writeContract({
      address: this.worldAddress,
      abi: agentRegistryAbi,
      functionName: 'pantheon__appendMemory',
      args: [
        this.tokenId,
        input.encryptedDeltaURI,
        input.deltaHash,
        input.action,
      ],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }
}

function decodePermissionBits(permissions: Hex): bigint {
  if (permissions === '0x') {
    return 0n;
  }

  return BigInt(permissions);
}
