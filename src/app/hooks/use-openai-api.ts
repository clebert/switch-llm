import * as React from 'react';
import type { Completion, IdleCompletions } from '../machines/completions-machine.js';
import type { Api } from './use-api.js';
import type { PromptedChat } from '../machines/chat-machine.js';
import type { SamplingParams } from './use-sampling-params.js';
import { useApiKey } from './use-api-key.js';
import { useOpenaiModel } from './use-openai-model.js';
import { useSamplingParams } from './use-sampling-params.js';
import { z } from 'zod';

export function useOpenaiApi(): Api | undefined {
  const [model] = useOpenaiModel();
  const [apiKey] = useApiKey();
  const samplingParams = useSamplingParams();

  return React.useMemo(
    () => (apiKey ? { sendPrompt: createSendPrompt(model, apiKey, samplingParams) } : undefined),
    [model, apiKey, samplingParams],
  );
}

function createSendPrompt(
  model: string,
  apiKey: string,
  { temperature, topP }: SamplingParams,
): (chat: PromptedChat, completions: IdleCompletions) => void {
  return (chat, completions) => {
    const messages = chat.value.messages.map(({ role, content }) => ({ role, content }));

    completions.actions.toFetching({
      abortController: new AbortController(),

      fetchCompletions: async (signal) =>
        fetch(`https://api.openai.com/v1/chat/completions`, {
          method: `POST`,
          headers: { 'content-type': `application/json`, 'authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages, temperature, top_p: topP, stream: true }),
          signal,
        }),

      parseCompletion,
    });
  };
}

const dataSchema = z.object({
  object: z.literal(`chat.completion.chunk`),
  model: z.string(),
  choices: z.tuple([
    z
      .object({
        delta: z.object({ content: z.string() }),
        finish_reason: z.null(),
      })
      .or(
        z.object({
          delta: z.object({}),
          finish_reason: z.literal(`content_filter`).or(z.literal(`length`)).or(z.literal(`stop`)),
        }),
      ),
  ]),
});

function parseCompletion(data: string): Completion {
  console.debug(data);

  const [choice] = dataSchema.parse(JSON.parse(data)).choices;

  return choice.finish_reason
    ? { finishReason: choice.finish_reason === `length` ? `context_size` : `stop` }
    : { contentDelta: choice.delta.content };
}
