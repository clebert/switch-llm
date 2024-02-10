import * as React from 'react';
import type { Temperature } from '../machines/temperature-machine.js';
import { temperatureMachine } from '../machines/temperature-machine.js';

export function useTemperature(): readonly [Temperature, () => void] {
  return [
    React.useSyncExternalStore(temperatureMachine.subscribe, () => temperatureMachine.get()).state,
    React.useCallback(() => temperatureMachine.get().actions.toggle(), []),
  ];
}
