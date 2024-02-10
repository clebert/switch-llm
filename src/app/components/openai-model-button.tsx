import * as React from 'react';
import { Button } from 'wtfkit';
import { useOpenaiModel } from '../hooks/use-openai-model.js';

export function OpenaiModelButton(): JSX.Element {
  const [openaiModel, toggleOpenaiModel] = useOpenaiModel();

  return (
    <Button className="border-dashed" title="OpenAI model" onClick={toggleOpenaiModel}>
      {openaiModel}
    </Button>
  );
}
