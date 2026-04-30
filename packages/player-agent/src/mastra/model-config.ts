const DEFAULT_OPENAI_MODEL = 'openai/gpt-5-mini';
const DEFAULT_OPENROUTER_MODEL = 'openrouter/openai/gpt-4o-mini';

const configuredModel = process.env.MASTRA_AGENT_MODEL?.trim();
const configuredOpenRouterModel = process.env.OPENROUTER_TEXT_MODEL?.trim();

export const playerAgentModel =
  configuredModel ||
  (process.env.OPENROUTER_API_KEY
    ? configuredOpenRouterModel?.startsWith('openrouter/')
      ? configuredOpenRouterModel
      : `openrouter/${configuredOpenRouterModel || 'openai/gpt-4o-mini'}`
    : DEFAULT_OPENAI_MODEL);

export const defaultOpenRouterModel = DEFAULT_OPENROUTER_MODEL;
