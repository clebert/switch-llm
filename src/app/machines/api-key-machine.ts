import { createJsonStorageItem } from 'wtfkit';
import { createMachine } from 'state-guard';
import { z } from 'zod';

const storageItem = createJsonStorageItem(`apiKey`, z.string());

export const apiKeyMachine = createMachine({
  initialState: `current`,
  initialValue: storageItem.value,
  transformerMap: { current: (value: string | undefined) => value || undefined },
  transitionsMap: { current: { set: `current` } },
});

apiKeyMachine.subscribe(() => {
  storageItem.value = apiKeyMachine.get().value;
});
