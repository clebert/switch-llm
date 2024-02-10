import * as React from 'react';
import { Button, Icon } from 'wtfkit';
import { FunnelIcon } from '@heroicons/react/24/outline';
import { useTopP } from '../hooks/use-top-p.js';

export function TopPButton(): JSX.Element {
  const [topP, toggleTopP] = useTopP();

  return (
    <Button className="border-dashed" title="Top-p" onClick={toggleTopP}>
      <Icon type={FunnelIcon} />
      {topP}
    </Button>
  );
}
