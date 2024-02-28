import * as React from 'react';
import { Button, Container, Icon, StandaloneIcon } from 'wtfkit';
import type { EmptyChat, RespondedChat } from '../machines/chat-machine.js';
import { ExclamationTriangleIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { ApiContext } from '../contexts/api-context.js';
import type { Editor } from './editor-view.js';
import { EditorView } from './editor-view.js';
import type { IdleCompletions } from '../machines/completions-machine.js';
import { appendUserMessage } from '../machines/chat-machine.js';

export interface PromptViewProps {
  readonly chat: EmptyChat | RespondedChat;
  readonly completions: IdleCompletions;
}

export function PromptView({ chat, completions }: PromptViewProps): JSX.Element {
  React.useEffect(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  }, []);

  const [editor, setEditor] = React.useState<Editor | null>(null);
  const content = React.useDeferredValue(editor?.content);
  const api = React.useContext(ApiContext);

  const sendPromptCallback = React.useMemo(
    () =>
      content && api
        ? () => api.sendPrompt(appendUserMessage(chat, content), completions)
        : undefined,
    [chat, completions, content, api],
  );

  const translate = React.useCallback(() => {
    editor?.set(``);
    editor?.append(`Please translate the following text into english: ""`);
    editor?.focus(-1);
  }, [editor]);

  return React.useMemo(
    () => (
      <>
        <Container>
          <Container col grow>
            <EditorView ref={setEditor} autoFocus />
          </Container>

          <Container col>
            <Button title="Send prompt" inverted onClick={sendPromptCallback}>
              <Icon type={PaperAirplaneIcon} standalone />
            </Button>

            {completions.value.error !== undefined && (
              <StandaloneIcon type={ExclamationTriangleIcon} title={`Error`} />
            )}

            {completions.value.finishReason === `context_size` && (
              <StandaloneIcon type={ExclamationTriangleIcon} title={`Context size`} />
            )}
          </Container>
        </Container>

        <Container>
          <Button title="Translate" onClick={translate}>
            Translate
          </Button>
        </Container>
      </>
    ),
    [completions, sendPromptCallback, translate],
  );
}
