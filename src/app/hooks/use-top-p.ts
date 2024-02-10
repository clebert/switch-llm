import * as React from 'react';
import type { TopP } from '../machines/top-p-machine.js';
import { topPMachine } from '../machines/top-p-machine.js';

export function useTopP(): readonly [TopP, () => void] {
  return [
    React.useSyncExternalStore(topPMachine.subscribe, () => topPMachine.get()).state,
    React.useCallback(() => topPMachine.get().actions.toggle(), []),
  ];
}
