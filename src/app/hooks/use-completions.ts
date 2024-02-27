import * as React from 'react';
import type { Completions } from '../machines/completions-machine.js';
import type { InferStateUnion } from 'state-guard';
import { completionsMachine } from '../machines/completions-machine.js';

export function useCompletions(
  preferredState?: InferStateUnion<typeof completionsMachine>,
): Completions {
  return React.useSyncExternalStore(
    (listener) =>
      completionsMachine.subscribe(() => {
        if (!preferredState || preferredState === completionsMachine.get().state) {
          listener();
        }
      }),
    () => completionsMachine.get(),
  );
}
