import * as React from 'react';
import { modelPathMachine } from '../machines/model-path-machine.js';

export function useModelPath(): readonly [string | undefined, (modelPath: string) => void] {
  return [
    React.useSyncExternalStore(modelPathMachine.subscribe, () => modelPathMachine.get()).value,
    React.useCallback((value: string) => modelPathMachine.get().actions.set(value), []),
  ];
}
