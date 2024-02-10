import type { IdleCompletions } from '../machines/completions-machine.js';
import type { PromptedChat } from '../machines/chat-machine.js';
import { useApiType } from './use-api-type.js';
import { useLocalApi } from './use-local-api.js';
import { useOpenaiApi } from './use-openai-api.js';

export interface Api {
  sendPrompt: (chat: PromptedChat, completions: IdleCompletions) => void;
}

export function useApi(): Api | undefined {
  const [apiType] = useApiType();
  const localApi = useLocalApi();
  const openaiApi = useOpenaiApi();

  return apiType === `local` ? localApi : openaiApi;
}
