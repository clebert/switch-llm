import * as React from 'react';
import { TextField } from 'wtfkit';
import { useModelPath } from '../hooks/use-model-path.js';

export function ModelPathView(): JSX.Element {
  const [modelPath, setModelPath] = useModelPath();
  const [focused, setFocused] = React.useState(false);

  const modelName = React.useMemo(
    () => (focused ? modelPath : modelPath?.split(`/`).pop()),
    [focused, modelPath],
  );

  return (
    <TextField
      value={modelName ?? ``}
      placeholder="Model path"
      onBlur={React.useCallback(() => setFocused(false), [])}
      onFocus={React.useCallback(() => setFocused(true), [])}
      onInput={setModelPath}
    />
  );
}
