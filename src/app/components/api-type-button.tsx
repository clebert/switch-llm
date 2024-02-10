import * as React from 'react';
import { Button } from 'wtfkit';
import { useApiType } from '../hooks/use-api-type.js';

export function ApiTypeButton(): JSX.Element {
  const [apiType, toggleApiType] = useApiType();

  return (
    <Button className="border-dashed" title="API type" onClick={toggleApiType}>
      {apiType === `local` ? `Local` : `OpenAI`}
    </Button>
  );
}
