import * as React from 'react';
import { Button } from 'wtfkit';
import { useTemplate } from '../hooks/use-template.js';

const titles = { gemma: `Gemma`, llama: `Llama`, mistral: `Mistral` };

export function TemplateButton(): JSX.Element {
  const [template, toggleTemplate] = useTemplate();

  return (
    <Button className="border-dashed" title="Chat template" onClick={toggleTemplate}>
      {titles[template]}
    </Button>
  );
}
