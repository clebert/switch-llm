import * as React from 'react';
import type { ApiType } from '../machines/api-type-machine.js';
import { apiTypeMachine } from '../machines/api-type-machine.js';

export function useApiType(): readonly [ApiType, () => void] {
  return [
    React.useSyncExternalStore(apiTypeMachine.subscribe, () => apiTypeMachine.get()).state,
    React.useCallback(() => apiTypeMachine.get().actions.toggle(), []),
  ];
}
