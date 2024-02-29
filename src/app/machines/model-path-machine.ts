import { createJsonStorageItem } from 'wtfkit';
import { createMachine } from 'state-guard';
import { z } from 'zod';

const storageItem = createJsonStorageItem(`modelPath`, z.string());

export const modelPathMachine = createMachine({
  initialState: `current`,
  initialValue: storageItem.value,
  transformerMap: { current: (value: string | undefined) => value || undefined },
  transitionsMap: { current: { set: `current` } },
});

modelPathMachine.subscribe(() => {
  storageItem.value = modelPathMachine.get().value;
});

window.setModelPath = (value: string) => {
  modelPathMachine.get().actions.set(value);
};
