import type { InferStateUnion } from 'state-guard';
import { createJsonStorageItem } from 'wtfkit';
import { createMachine } from 'state-guard';
import { z } from 'zod';

export type Template = InferStateUnion<typeof templateMachine>;

const storageItem = createJsonStorageItem(
  `template`,
  z.literal(`gemma`).or(z.literal(`llama`)).or(z.literal(`mistral`)),
);

export const templateMachine = createMachine({
  initialState: storageItem.value ?? `mistral`,
  initialValue: undefined,

  transformerMap: {
    gemma: () => undefined,
    llama: () => undefined,
    mistral: () => undefined,
  },

  transitionsMap: {
    gemma: { toggle: `llama` },
    llama: { toggle: `mistral` },
    mistral: { toggle: `gemma` },
  },
});

templateMachine.subscribe(() => {
  storageItem.value = templateMachine.get().state;
});
