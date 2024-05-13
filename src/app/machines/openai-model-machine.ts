import type { InferStateUnion } from 'state-guard';
import { createJsonStorageItem } from 'wtfkit';
import { createMachine } from 'state-guard';
import { z } from 'zod';

export type OpenaiModel = InferStateUnion<typeof openaiModelMachine>;

const storageItem = createJsonStorageItem(
  `openaiModel`,
  z
    .literal(`gpt-4o`)
    .or(z.literal(`gpt-4-turbo`))
    .or(z.literal(`gpt-4`))
    .or(z.literal(`gpt-3.5-turbo`)),
);

export const openaiModelMachine = createMachine({
  initialState: storageItem.value ?? `gpt-4o`,
  initialValue: undefined,

  transformerMap: {
    'gpt-4o': () => undefined,
    'gpt-4-turbo': () => undefined,
    'gpt-4': () => undefined,
    'gpt-3.5-turbo': () => undefined,
  },

  transitionsMap: {
    'gpt-4o': { toggle: `gpt-4-turbo` },
    'gpt-4-turbo': { toggle: `gpt-4` },
    'gpt-4': { toggle: `gpt-3.5-turbo` },
    'gpt-3.5-turbo': { toggle: `gpt-4o` },
  },
});

openaiModelMachine.subscribe(() => {
  storageItem.value = openaiModelMachine.get().state;
});
