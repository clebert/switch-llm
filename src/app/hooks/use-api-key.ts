import * as React from 'react';
import { apiKeyMachine } from '../machines/api-key-machine.js';

export function useApiKey(): readonly [string | undefined, (apiKey: string) => void] {
  return [
    React.useSyncExternalStore(apiKeyMachine.subscribe, () => apiKeyMachine.get()).value,
    React.useCallback((value: string) => apiKeyMachine.get().actions.set(value), []),
  ];
}
