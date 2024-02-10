import type { InferStateUnion } from 'state-guard';
import { createJsonStorageItem } from 'wtfkit';
import { createMachine } from 'state-guard';
import { z } from 'zod';

export type TopP = InferStateUnion<typeof topPMachine>;

const storageItem = createJsonStorageItem(
  `topP`,
  z
    .literal(`0.1`)
    .or(z.literal(`0.2`))
    .or(z.literal(`0.3`))
    .or(z.literal(`0.4`))
    .or(z.literal(`0.5`))
    .or(z.literal(`0.6`))
    .or(z.literal(`0.7`))
    .or(z.literal(`0.8`))
    .or(z.literal(`0.9`))
    .or(z.literal(`0.95`))
    .or(z.literal(`1.0`)),
);

export const topPMachine = createMachine({
  initialState: storageItem.value ?? `0.95`,
  initialValue: undefined,

  transformerMap: {
    '0.1': () => undefined,
    '0.2': () => undefined,
    '0.3': () => undefined,
    '0.4': () => undefined,
    '0.5': () => undefined,
    '0.6': () => undefined,
    '0.7': () => undefined,
    '0.8': () => undefined,
    '0.9': () => undefined,
    '0.95': () => undefined,
    '1.0': () => undefined,
  },

  transitionsMap: {
    '0.1': { toggle: `0.2` },
    '0.2': { toggle: `0.3` },
    '0.3': { toggle: `0.4` },
    '0.4': { toggle: `0.5` },
    '0.5': { toggle: `0.6` },
    '0.6': { toggle: `0.7` },
    '0.7': { toggle: `0.8` },
    '0.8': { toggle: `0.9` },
    '0.9': { toggle: `0.95` },
    '0.95': { toggle: `1.0` },
    '1.0': { toggle: `0.1` },
  },
});

topPMachine.subscribe(() => {
  storageItem.value = topPMachine.get().state;
});
