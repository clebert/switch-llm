import type { InferSnapshot } from 'state-guard';
import { createDataGenerator } from '../create-data-generator.js';
import { createMachine } from 'state-guard';

export interface IdleValue {
  readonly content?: string | undefined;
  readonly error?: unknown;
  readonly finishReason?: 'context_size' | 'stop' | undefined;
}

export interface FetchingValue {
  readonly abortController: AbortController;
  readonly fetchCompletions: (signal: AbortSignal) => Promise<Response>;
  readonly parseCompletion: (data: string) => Completion;
}

export type Completion =
  | { readonly contentDelta: string }
  | { readonly finishReason: 'context_size' | 'stop' };

export interface StreamingValue {
  readonly abortController: AbortController;
  readonly content: string;
  readonly contentDelta: string;
}

export type Completions = InferSnapshot<typeof completionsMachine>;
export type IdleCompletions = InferSnapshot<typeof completionsMachine, 'idle'>;
export type FetchingCompletions = InferSnapshot<typeof completionsMachine, 'fetching'>;
export type StreamingCompletions = InferSnapshot<typeof completionsMachine, 'streaming'>;

export const completionsMachine = createMachine({
  initialState: `idle`,
  initialValue: {},

  transformerMap: {
    idle: (value: IdleValue) => value,
    fetching: (value: FetchingValue): FetchingValue => value,

    streaming: (contentDelta: string): StreamingValue => {
      const completions = completionsMachine.assert(
        ...completionsMachine.getPrevStates(`streaming`),
      );

      const { abortController } = completions.value;

      if (completions.state === `fetching`) {
        return { abortController, content: contentDelta, contentDelta };
      }

      const { content } = completions.value;

      return { abortController, content: content + contentDelta, contentDelta };
    },
  },

  transitionsMap: {
    idle: { fetch: `fetching` },
    fetching: { idle: `idle`, stream: `streaming` },
    streaming: { idle: `idle`, stream: `streaming` },
  },
});

completionsMachine.subscribe(() => void handleFetching().catch((error) => console.error(error)));

async function handleFetching(): Promise<void> {
  const fetchingCompletions = completionsMachine.get(`fetching`);

  if (!fetchingCompletions) {
    return;
  }

  let streamingCompletions: StreamingCompletions | undefined;

  try {
    const { abortController, fetchCompletions, parseCompletion } = fetchingCompletions.value;
    const response = await fetchCompletions(abortController.signal);

    let completions = completionsMachine.get();

    if (completions !== fetchingCompletions) {
      return;
    }

    if (!response.body || !response.ok) {
      throw new Error(response.statusText);
    }

    for await (const data of createDataGenerator(response.body.getReader())) {
      completions = completionsMachine.get();

      if (data === `[DONE]`) {
        if (completions === fetchingCompletions || completions === streamingCompletions) {
          throw new Error(`unexpected server-sent data`);
        }

        return;
      }

      if (completions !== fetchingCompletions && completions !== streamingCompletions) {
        return;
      }

      const result = parseCompletion(data);

      if (`contentDelta` in result) {
        streamingCompletions = completions.actions.stream(result.contentDelta);
      } else if (completions.state === `fetching`) {
        completions.actions.idle(result);
      } else {
        completions.actions.idle({ ...result, content: completions.value.content });
      }
    }

    throw new Error(`unexpected connection close`);
  } catch (error) {
    console.error(error);

    const completions = completionsMachine.get();

    if (completions === fetchingCompletions) {
      const { abortController } = completions.value;
      const { signal } = abortController;

      completions.actions.idle({ error: signal.aborted ? undefined : error });
      abortController.abort();
    } else if (completions === streamingCompletions) {
      const { abortController, content } = completions.value;
      const { signal } = abortController;

      completions.actions.idle({ content, error: signal.aborted ? undefined : error });
      abortController.abort();
    }
  }
}
