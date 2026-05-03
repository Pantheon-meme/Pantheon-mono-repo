import type { MastraModelConfig } from '@mastra/core/llm';
import { loadLocalEnvFiles } from './load-env';
import {
  getZeroGComputeModelConfig,
  getZeroGComputeModelName,
  shouldUseZeroGComputeWallet,
} from './zerog/compute';

loadLocalEnvFiles();

if (process.env.INIT_CWD) {
  loadLocalEnvFiles(process.env.INIT_CWD);
}

const DEFAULT_OPENAI_MODEL = 'openai/gpt-5-mini';
const DEFAULT_OPENROUTER_MODEL = 'openrouter/openai/gpt-4o-mini';
const DEFAULT_OG_COMPUTE_MODEL = 'qwen/qwen3-vl-30b-a3b-instruct';
const OG_COMPUTE_MAINNET_ROUTER_URL = 'https://router-api.0g.ai/v1';
const OG_COMPUTE_TESTNET_ROUTER_URL =
  'https://router-api-testnet.integratenetwork.work/v1';

const configuredModel = process.env.MASTRA_AGENT_MODEL?.trim();
const configuredOpenRouterModel = process.env.OPENROUTER_TEXT_MODEL?.trim();
const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim();
const ogComputeApiKey = (
  process.env.OG_COMPUTE_API_KEY ?? process.env.ZG_COMPUTE_API_KEY
)?.trim();
const ogComputeNetwork = (
  process.env.OG_COMPUTE_NETWORK ??
  process.env.ZG_COMPUTE_NETWORK ??
  'testnet'
)
  .trim()
  .toLowerCase();
const configuredOgComputeModel = (
  process.env.OG_COMPUTE_MODEL ?? process.env.ZG_COMPUTE_MODEL
)?.trim();
const ogComputeModel = configuredOgComputeModel || DEFAULT_OG_COMPUTE_MODEL;
const usesOgComputeWallet = !configuredModel && shouldUseZeroGComputeWallet();
const ogComputeRouterUrl =
  process.env.OG_COMPUTE_ROUTER_URL?.trim() ||
  process.env.ZG_COMPUTE_ROUTER_URL?.trim() ||
  (ogComputeNetwork === 'mainnet'
    ? OG_COMPUTE_MAINNET_ROUTER_URL
    : OG_COMPUTE_TESTNET_ROUTER_URL);
const openRouterModel = (
  configuredOpenRouterModel?.startsWith('openrouter/')
    ? configuredOpenRouterModel
    : `openrouter/${configuredOpenRouterModel || 'openai/gpt-4o-mini'}`
) as `${string}/${string}`;
const usesOgCompute =
  !usesOgComputeWallet && !configuredModel && Boolean(ogComputeApiKey);
const selectedModel = (configuredModel || openRouterModel) as `${string}/${string}`;
const usesOpenRouter =
  !usesOgComputeWallet && !usesOgCompute && selectedModel.startsWith('openrouter/');
const openRouterProviderModel = selectedModel.replace(/^openrouter\//, '');

if (usesOpenRouter) {
  const keyPreview = openRouterApiKey
    ? `${openRouterApiKey.slice(0, 6)}...${openRouterApiKey.slice(-4)}`
    : '<missing>';

  console.info(
    `[player-agent] OpenRouter model=${selectedModel} key=${keyPreview} keyLength=${openRouterApiKey?.length ?? 0}`,
  );
}

if (usesOgCompute) {
  const keyPreview = ogComputeApiKey
    ? `${ogComputeApiKey.slice(0, 6)}...${ogComputeApiKey.slice(-4)}`
    : '<missing>';

  console.info(
    `[player-agent] 0G Compute model=${ogComputeModel} router=${ogComputeRouterUrl} key=${keyPreview} keyLength=${ogComputeApiKey?.length ?? 0}`,
  );
}

export const playerAgentModel: MastraModelConfig =
  usesOgComputeWallet
    ? (async () => getZeroGComputeModelConfig()) as unknown as MastraModelConfig
    : usesOgCompute && ogComputeApiKey
    ? {
        providerId: '0g-compute',
        modelId: ogComputeModel,
        url: ogComputeRouterUrl,
        apiKey: ogComputeApiKey,
        headers: {
          Authorization: `Bearer ${ogComputeApiKey}`,
        },
      }
    : usesOpenRouter && openRouterApiKey
    ? {
        providerId: 'openrouter',
        modelId: openRouterProviderModel,
        url: 'https://openrouter.ai/api/v1',
        apiKey: openRouterApiKey,
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
        },
      }
    : configuredModel || DEFAULT_OPENAI_MODEL;

if (usesOgComputeWallet) {
  console.info(
    `[player-agent] 0G Compute requested via wallet model=${getZeroGComputeModelName()}`,
  );
}

export const defaultOpenRouterModel = DEFAULT_OPENROUTER_MODEL;
