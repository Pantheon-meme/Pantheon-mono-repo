import type { MastraModelConfig } from '@mastra/core/llm';
import { loadLocalEnvFiles } from './load-env';

loadLocalEnvFiles();

if (process.env.INIT_CWD) {
  loadLocalEnvFiles(process.env.INIT_CWD);
}

const DEFAULT_OPENAI_MODEL = 'openai/gpt-5-mini';
const DEFAULT_OPENROUTER_MODEL = 'openrouter/openai/gpt-4o-mini';

const configuredModel = process.env.MASTRA_AGENT_MODEL?.trim();
const configuredOpenRouterModel = process.env.OPENROUTER_TEXT_MODEL?.trim();
const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim();
const openRouterModel = (
  configuredOpenRouterModel?.startsWith('openrouter/')
    ? configuredOpenRouterModel
    : `openrouter/${configuredOpenRouterModel || 'openai/gpt-4o-mini'}`
) as `${string}/${string}`;
const selectedModel = (configuredModel || openRouterModel) as `${string}/${string}`;
const usesOpenRouter = selectedModel.startsWith('openrouter/');
const openRouterProviderModel = selectedModel.replace(/^openrouter\//, '');

if (usesOpenRouter) {
  const keyPreview = openRouterApiKey
    ? `${openRouterApiKey.slice(0, 6)}...${openRouterApiKey.slice(-4)}`
    : '<missing>';

  console.info(
    `[player-agent] OpenRouter model=${selectedModel} key=${keyPreview} keyLength=${openRouterApiKey?.length ?? 0}`,
  );
}

export const playerAgentModel: MastraModelConfig =
  usesOpenRouter && openRouterApiKey
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

export const defaultOpenRouterModel = DEFAULT_OPENROUTER_MODEL;
