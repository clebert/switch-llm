import * as React from 'react';
import type { Completions } from '../machines/completions-machine.js';
import { completionsMachine } from '../machines/completions-machine.js';

export function useCompletions(): Completions {
  return React.useSyncExternalStore(completionsMachine.subscribe, () => completionsMachine.get());
}
