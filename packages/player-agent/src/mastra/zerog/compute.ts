import type { MastraModelConfig, OpenAICompatibleConfig } from '@mastra/core/llm';
import { loadLocalEnvFiles } from '../load-env';

const DEFAULT_OG_COMPUTE_MODEL = 'qwen/qwen3-vl-30b-a3b-instruct';
const OG_COMPUTE_MAINNET_RPC_URL = 'https://evmrpc.0g.ai';
const OG_COMPUTE_TESTNET_RPC_URL = 'https://evmrpc-testnet.0g.ai';

type ZeroGComputeRuntime = {
  config: OpenAICompatibleConfig;
  providerAddress: string;
  endpoint: string;
  model: string;
  walletAddress: string;
};

let runtimePromise: Promise<ZeroGComputeRuntime> | undefined;
let loggedRuntime = false;

export function isZeroGComputeWalletConfigured(): boolean {
  loadZeroGComputeEnv();

  return Boolean(getZeroGComputePrivateKey()) && wantsZeroGComputeWallet();
}

export function shouldUseZeroGComputeWallet(): boolean {
  loadZeroGComputeEnv();

  return wantsZeroGComputeWallet();
}

export function getZeroGComputeModelName(): string {
  return (
    process.env.OG_COMPUTE_MODEL?.trim() ||
    process.env.ZG_COMPUTE_MODEL?.trim() ||
    DEFAULT_OG_COMPUTE_MODEL
  );
}

export async function getZeroGComputeModelConfig(): Promise<MastraModelConfig> {
  const runtime = await getZeroGComputeRuntime();

  return runtime.config;
}

export function resetZeroGComputeRuntimeForTests(): void {
  runtimePromise = undefined;
  loggedRuntime = false;
}

async function getZeroGComputeRuntime(): Promise<ZeroGComputeRuntime> {
  runtimePromise ??= createZeroGComputeRuntime();
  return runtimePromise;
}

async function createZeroGComputeRuntime(): Promise<ZeroGComputeRuntime> {
  loadZeroGComputeEnv();

  const privateKey = getZeroGComputePrivateKey();
  if (!privateKey) {
    throw new Error(
      'Missing OG_PRIVATE_KEY for 0G Compute wallet mode. Set OG_PRIVATE_KEY once and reuse it for storage and compute.',
    );
  }

  const [{ createZGComputeNetworkBroker }, { ethers }] = await Promise.all([
    import('@0gfoundation/0g-compute-ts-sdk'),
    import('ethers'),
  ]);
  const rpcUrl = getZeroGComputeRpcUrl();
  const wallet = new ethers.Wallet(
    privateKey,
    new ethers.JsonRpcProvider(rpcUrl),
  );
  const broker = await createZGComputeNetworkBroker(wallet);
  const requestedModel = getZeroGComputeModelName();
  const providerAddress =
    process.env.OG_COMPUTE_PROVIDER_ADDRESS?.trim() ||
    process.env.ZG_COMPUTE_PROVIDER_ADDRESS?.trim() ||
    (await discoverProviderAddress(broker, requestedModel));

  if (!providerAddress) {
    throw new Error(
      `No 0G Compute chatbot provider found for model "${requestedModel}". Set OG_COMPUTE_PROVIDER_ADDRESS to choose a provider explicitly.`,
    );
  }

  if (readBooleanEnv('OG_COMPUTE_AUTO_FUND', false)) {
    await broker.inference.startAutoFunding(providerAddress);
  }

  const [{ endpoint, model }, headers, walletAddress] = await Promise.all([
    broker.inference.getServiceMetadata(providerAddress),
    broker.inference.getRequestHeaders(providerAddress),
    wallet.getAddress(),
  ]);
  const modelId = model || requestedModel;
  const config: OpenAICompatibleConfig = {
    providerId: '0g-compute-direct',
    modelId,
    url: stripTrailingSlash(endpoint),
    apiKey: '',
    headers: { ...headers },
  };
  const runtime = {
    config,
    providerAddress,
    endpoint: config.url ?? endpoint,
    model: modelId,
    walletAddress,
  };

  logRuntime(runtime);

  return runtime;
}

async function discoverProviderAddress(
  broker: Awaited<
    ReturnType<
      typeof import('@0gfoundation/0g-compute-ts-sdk')['createZGComputeNetworkBroker']
    >
  >,
  requestedModel: string,
): Promise<string | undefined> {
  const services = await broker.inference.listService(0, 100);
  const normalizedRequestedModel = normalizeModelId(requestedModel);
  const exact = services.find(
    (service) =>
      service.serviceType === 'chatbot' &&
      normalizeModelId(service.model) === normalizedRequestedModel,
  );

  if (exact) return exact.provider;

  const loose = services.find(
    (service) =>
      service.serviceType === 'chatbot' &&
      normalizeModelId(service.model).includes(normalizedRequestedModel),
  );

  return loose?.provider;
}

function wantsZeroGComputeWallet(): boolean {
  if (readBooleanEnv('OG_COMPUTE_USE_WALLET', false)) {
    return true;
  }

  return Boolean(
    (process.env.OG_COMPUTE_MODEL?.trim() || process.env.ZG_COMPUTE_MODEL?.trim()) &&
      getZeroGComputePrivateKey(),
  );
}

function getZeroGComputePrivateKey(): string | undefined {
  return (
    process.env.OG_COMPUTE_PRIVATE_KEY?.trim() ||
    process.env.ZG_COMPUTE_PRIVATE_KEY?.trim() ||
    process.env.OG_PRIVATE_KEY?.trim()
  );
}

function getZeroGComputeRpcUrl(): string {
  const network = (
    process.env.OG_COMPUTE_NETWORK ??
    process.env.ZG_COMPUTE_NETWORK ??
    'mainnet'
  )
    .trim()
    .toLowerCase();

  return (
    process.env.OG_COMPUTE_RPC_URL?.trim() ||
    process.env.ZG_COMPUTE_RPC_URL?.trim() ||
    process.env.OG_RPC_URL?.trim() ||
    (network === 'testnet'
      ? OG_COMPUTE_TESTNET_RPC_URL
      : OG_COMPUTE_MAINNET_RPC_URL)
  );
}

function loadZeroGComputeEnv(): void {
  loadLocalEnvFiles();
  if (process.env.INIT_CWD) {
    loadLocalEnvFiles(process.env.INIT_CWD);
  }
}

function logRuntime(runtime: ZeroGComputeRuntime): void {
  if (loggedRuntime) return;
  loggedRuntime = true;

  console.info(
    [
      '[player-agent] 0G Compute wallet mode',
      `model=${runtime.model}`,
      `provider=${runtime.providerAddress}`,
      `wallet=${runtime.walletAddress}`,
      `endpoint=${runtime.endpoint}`,
    ].join(' '),
  );
}

function normalizeModelId(model: string): string {
  return model.trim().toLowerCase();
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();

  if (!value) return fallback;

  return ['1', 'true', 'yes', 'on'].includes(value)
    ? true
    : ['0', 'false', 'no', 'off'].includes(value)
      ? false
      : fallback;
}
