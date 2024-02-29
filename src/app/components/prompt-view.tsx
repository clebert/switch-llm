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

const prompts = {
  correct: `Review the text below for spelling, grammar, and punctuation errors. \
Correct them to improve readability while keeping the original meaning intact:\n\n`,

  enhance: `Improve clarity, tone, and style of the text below. \
Choose words that elevate the message without altering the essence:\n\n`,

  simplify: `Rewrite the text below in simple language for easier understanding by children or non-native speakers. \
Keep essential facts and insights clear and intact:\n\n`,

  summarize: `Summarize the text below, highlighting key points and conclusions. \
The summary should accurately reflect the original text's core message:\n\n`,

  translate: `Translate the text below into English, \
capturing both the explicit content and subtle nuances accurately:\n\n`,
};

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

  const clear = React.useCallback(() => {
    if (chat.state === `responded`) {
      chat.actions.empty();
    }

    editor?.set(``);
    editor?.focus();
  }, [chat, editor]);

  const correct = React.useCallback(() => {
    editor?.set(``);
    editor?.append(prompts.correct);
    editor?.focus();
  }, [editor]);

  const enhance = React.useCallback(() => {
    editor?.set(``);
    editor?.append(prompts.enhance);
    editor?.focus();
  }, [editor]);

  const simplify = React.useCallback(() => {
    editor?.set(``);
    editor?.append(prompts.simplify);
    editor?.focus();
  }, [editor]);

  const summarize = React.useCallback(() => {
    editor?.set(``);
    editor?.append(prompts.summarize);
    editor?.focus();
  }, [editor]);

  const translate = React.useCallback(() => {
    editor?.set(``);
    editor?.append(prompts.translate);
    editor?.focus();
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
          <Button title="Clear" onClick={clear}>
            Clear
          </Button>

          <Button title="Correct" onClick={correct}>
            Correct
          </Button>

          <Button title="Enhance" onClick={enhance}>
            Enhance
          </Button>

          <Button title="Simplify" onClick={simplify}>
            Simplify
          </Button>

          <Button title="Summarize" onClick={summarize}>
            Summarize
          </Button>

          <Button title="Translate" onClick={translate}>
            Translate
          </Button>
        </Container>
      </>
    ),
    [completions, sendPromptCallback, clear, correct, enhance, simplify, summarize, translate],
  );
}
