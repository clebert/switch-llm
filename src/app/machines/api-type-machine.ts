import type { InferStateUnion } from 'state-guard';
import { createJsonStorageItem } from 'wtfkit';
import { createMachine } from 'state-guard';
import { z } from 'zod';

export type ApiType = InferStateUnion<typeof apiTypeMachine>;

const storageItem = createJsonStorageItem(`apiType`, z.literal(`local`).or(z.literal(`openai`)));

export const apiTypeMachine = createMachine({
  initialState: storageItem.value ?? `local`,
  initialValue: undefined,

  transformerMap: {
    local: () => undefined,
    openai: () => undefined,
  },

  transitionsMap: {
    local: { toggle: `openai` },
    openai: { toggle: `local` },
  },
});

apiTypeMachine.subscribe(() => {
  storageItem.value = apiTypeMachine.get().state;
});
