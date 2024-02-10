import * as React from 'react';
import { useTemperature } from './use-temperature.js';
import { useTopP } from './use-top-p.js';

export interface SamplingParams {
  readonly temperature: number;
  readonly topP: number;
}

export function useSamplingParams(): SamplingParams {
  const [temperature] = useTemperature();
  const [topP] = useTopP();

  return React.useMemo(
    () => ({ temperature: parseFloat(temperature), topP: parseFloat(topP) }),
    [temperature, topP],
  );
}
