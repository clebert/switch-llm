import * as React from 'react';
import { Button, Icon } from 'wtfkit';
import { AdjustmentsVerticalIcon } from '@heroicons/react/24/outline';
import { useTemperature } from '../hooks/use-temperature.js';

export function TemperatureButton(): JSX.Element {
  const [temperature, toggleTemperature] = useTemperature();

  return (
    <Button className="border-dashed" title="Temperature" onClick={toggleTemperature}>
      <Icon type={AdjustmentsVerticalIcon} />
      {temperature}
    </Button>
  );
}
