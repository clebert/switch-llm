import * as React from 'react';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button, Container, Icon } from 'wtfkit';
import type { FetchingCompletions, StreamingCompletions } from '../machines/completions-machine.js';
import type { Editor } from './editor-view.js';
import { EditorView } from './editor-view.js';
import { MessageIcon } from './message-icon.js';

export interface CompletionsViewProps {
  readonly completions: FetchingCompletions | StreamingCompletions;
}

export function CompletionsView({ completions }: CompletionsViewProps): JSX.Element {
  React.useEffect(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  }, []);

  const editorRef = React.useRef<Editor>(null);

  React.useEffect(() => {
    if (completions.state === `streaming`) {
      editorRef.current?.append(completions.value.contentDelta);
    }
  }, [completions]);

  const abortCompletionsCallback = React.useCallback(
    () => completions.value.abortController.abort(),
    [completions],
  );

  return React.useMemo(
    () => (
      <Container>
        <Container col grow>
          <EditorView ref={editorRef} readOnly />
        </Container>

        <Container col>
          <Button title="Abort completions" onClick={abortCompletionsCallback}>
            <Icon
              className={completions.state === `fetching` ? `animate-spin` : `animate-pulse`}
              type={completions.state === `fetching` ? ArrowPathIcon : XMarkIcon}
              standalone
            />
          </Button>

          <MessageIcon role="assistant" />
        </Container>
      </Container>
    ),
    [completions, abortCompletionsCallback],
  );
}
