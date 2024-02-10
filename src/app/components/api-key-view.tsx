import * as React from 'react';
import { TextField } from 'wtfkit';
import { useApiKey } from '../hooks/use-api-key.js';

export function ApiKeyView(): JSX.Element {
  const [apiKey, setApiKey] = useApiKey();
  const [focused, setFocused] = React.useState(false);

  return (
    <TextField
      type={focused ? `text` : `password`}
      value={apiKey ?? ``}
      placeholder="API key"
      onBlur={React.useCallback(() => setFocused(false), [])}
      onFocus={React.useCallback(() => setFocused(true), [])}
      onInput={setApiKey}
    />
  );
}
