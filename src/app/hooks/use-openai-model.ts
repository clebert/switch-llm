import * as React from 'react';
import type { OpenaiModel } from '../machines/openai-model-machine.js';
import { openaiModelMachine } from '../machines/openai-model-machine.js';

export function useOpenaiModel(): readonly [OpenaiModel, () => void] {
  return [
    React.useSyncExternalStore(openaiModelMachine.subscribe, () => openaiModelMachine.get()).state,
    React.useCallback(() => openaiModelMachine.get().actions.toggle(), []),
  ];
}
