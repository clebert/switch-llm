import * as React from 'react';
import type { Template } from '../machines/template-machine.js';
import { templateMachine } from '../machines/template-machine.js';

export function useTemplate(): readonly [Template, () => void] {
  return [
    React.useSyncExternalStore(templateMachine.subscribe, () => templateMachine.get()).state,
    React.useCallback(() => templateMachine.get().actions.toggle(), []),
  ];
}
