import * as React from 'react';
import type { Completion, IdleCompletions } from '../machines/completions-machine.js';
import type { Api } from './use-api.js';
import type { PromptedChat } from '../machines/chat-machine.js';
import type { SamplingParams } from './use-sampling-params.js';
import { useModelPath } from './use-model-path.js';
import { useSamplingParams } from './use-sampling-params.js';
import { useTemplate } from './use-template.js';
import { z } from 'zod';

export function useLocalApi(): Api | undefined {
  const [modelPath] = useModelPath();
  const [template] = useTemplate();
  const samplingParams = useSamplingParams();

  return React.useMemo(
    () =>
      modelPath ? { sendPrompt: createSendPrompt(modelPath, template, samplingParams) } : undefined,
    [modelPath, template, samplingParams],
  );
}

function createSendPrompt(
  modelPath: string,
  template: string,
  { temperature, topP }: SamplingParams,
): (chat: PromptedChat, completions: IdleCompletions) => void {
  return (chat, completions) => {
    const messages = chat.value.messages.map(({ role, content }) => ({ role, content }));
    const sampling_params = { temperature, top_p: topP };

    completions.actions.toFetching({
      abortController: new AbortController(),

      fetchCompletions: async (signal) =>
        fetch(`/completions`, {
          method: `POST`,
          headers: { 'content-type': `application/json` },
          body: JSON.stringify({ model_path: modelPath, template, messages, sampling_params }),
          signal,
        }),

      parseCompletion,
    });
  };
}

const dataSchema = z
  .object({ content_delta: z.string() })
  .or(z.object({ finish_reason: z.literal(`context_size`).or(z.literal(`stop`)) }));

function parseCompletion(data: string): Completion {
  console.debug(data);

  const result = dataSchema.parse(JSON.parse(data));

  return `content_delta` in result
    ? { contentDelta: result.content_delta }
    : { finishReason: result.finish_reason };
}
