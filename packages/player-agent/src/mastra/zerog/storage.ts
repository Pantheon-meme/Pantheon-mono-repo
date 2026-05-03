import { createHash } from 'node:crypto';
import { loadLocalEnvFiles } from '../load-env';

export type ZeroGStorageUploadResult = {
  uri: string;
  rootHash: `0x${string}`;
  txHash?: `0x${string}`;
};

export type ZeroGStorageUploadOptions = {
  name?: string;
  contentType?: string;
};

const defaultRpcUrl = 'https://evmrpc-testnet.0g.ai';
const defaultIndexerUrl = 'https://indexer-storage-testnet-turbo.0g.ai';
const defaultUriPrefix = '0g-storage://';

export function isZeroGStorageConfigured(): boolean {
  loadZeroGEnv();
  return Boolean(process.env.OG_PRIVATE_KEY?.trim());
}

export async function uploadJsonToZeroGStorage(
  payload: unknown,
  options: ZeroGStorageUploadOptions = {},
): Promise<ZeroGStorageUploadResult> {
  loadZeroGEnv();

  const privateKey = process.env.OG_PRIVATE_KEY?.trim();
  if (!privateKey) {
    throw new Error('Missing OG_PRIVATE_KEY for 0G Storage upload');
  }

  const rpcUrl = process.env.OG_RPC_URL?.trim() || defaultRpcUrl;
  const indexerUrl =
    process.env.OG_STORAGE_INDEXER_RPC?.trim() ||
    process.env.OG_STORAGE_ENDPOINT?.trim() ||
    defaultIndexerUrl;
  const uriPrefix = process.env.OG_STORAGE_URI_PREFIX?.trim() || defaultUriPrefix;
  const finalityRequired = process.env.OG_STORAGE_FINALITY_REQUIRED === 'true';
  const skipTx = process.env.OG_STORAGE_SKIP_TX !== 'false';
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const bytes = new TextEncoder().encode(json);
  const [{ Indexer, MemData }, { ethers }] = await Promise.all([
    import('@0gfoundation/0g-storage-ts-sdk'),
    import('ethers'),
  ]);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  const indexer = new Indexer(indexerUrl);
  const data = new MemData(bytes);
  const [tree, treeError] = await data.merkleTree();

  if (treeError !== null) {
    throw new Error(`0G Storage merkle tree error: ${treeError.message}`);
  }

  const [tx, uploadError] = await indexer.upload(
    data,
    rpcUrl,
    signer as never,
    {
      finalityRequired,
      skipIfFinalized: true,
      skipTx,
      tags: buildTags(options),
    },
  );

  if (uploadError !== null) {
    throw new Error(`0G Storage upload error: ${uploadError.message}`);
  }

  const rootHash = normalizeHash(readRootHash(tx, tree) ?? hashBytes(bytes));
  const txHash = readTxHash(tx);

  return {
    uri: `${uriPrefix}${rootHash}`,
    rootHash,
    txHash,
  };
}

function loadZeroGEnv(): void {
  loadLocalEnvFiles();
  if (process.env.INIT_CWD) {
    loadLocalEnvFiles(process.env.INIT_CWD);
  }
}

function buildTags(options: ZeroGStorageUploadOptions): Uint8Array {
  const tags = {
    app: 'pantheon-player-agent',
    contentType: options.contentType ?? 'application/json',
    name: options.name ?? 'memory-delta.json',
  };

  return new TextEncoder().encode(JSON.stringify(tags));
}

function readRootHash(tx: unknown, tree: unknown): unknown {
  if (isRecord(tx) && typeof tx.rootHash === 'string') {
    return tx.rootHash;
  }

  if (
    isRecord(tx) &&
    Array.isArray(tx.rootHashes) &&
    typeof tx.rootHashes[0] === 'string'
  ) {
    return tx.rootHashes[0];
  }

  if (
    isRecord(tree) &&
    typeof tree.rootHash === 'function' &&
    typeof tree.rootHash() === 'string'
  ) {
    return tree.rootHash();
  }

  return undefined;
}

function readTxHash(tx: unknown): `0x${string}` | undefined {
  if (isRecord(tx) && isBytes32Hex(tx.txHash)) {
    return normalizeHash(tx.txHash);
  }

  if (
    isRecord(tx) &&
    Array.isArray(tx.txHashes) &&
    isBytes32Hex(tx.txHashes[0])
  ) {
    return normalizeHash(tx.txHashes[0]);
  }

  return undefined;
}

function hashBytes(bytes: Uint8Array): `0x${string}` {
  return normalizeHash(createHash('sha256').update(bytes).digest('hex'));
}

function normalizeHash(value: unknown): `0x${string}` {
  if (typeof value !== 'string') {
    throw new Error(`Expected hex string, received ${typeof value}`);
  }

  const normalized = value.startsWith('0x') ? value : `0x${value}`;

  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error(`Expected bytes32 hex string, received ${value}`);
  }

  return normalized as `0x${string}`;
}

function isBytes32Hex(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.startsWith('0x') ? value : `0x${value}`;
  return /^0x[0-9a-fA-F]{64}$/.test(normalized);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
