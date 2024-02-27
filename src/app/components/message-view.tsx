import * as React from 'react';
import { ArrowPathIcon, PaperAirplaneIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button, Container, Icon } from 'wtfkit';
import type { ChatMessage, PromptedChat, RespondedChat } from '../machines/chat-machine.js';
import { deleteMessage, getLastMessage, updateMessage } from '../machines/chat-machine.js';
import type { Editor } from './editor-view.js';
import { EditorView } from './editor-view.js';
import { MessageIcon } from './message-icon.js';
import { useApi } from '../hooks/use-api.js';
import { useCompletions } from '../hooks/use-completions.js';

export interface MessageViewProps {
  readonly chat: PromptedChat | RespondedChat;
  readonly message: ChatMessage<'assistant'> | ChatMessage<'user'>;
}

export function MessageView({ chat, message }: MessageViewProps): JSX.Element {
  const [editor, setEditor] = React.useState<Editor | null>(null);
  const content = React.useDeferredValue(editor?.content);

  React.useEffect(() => {
    if (content !== undefined && content !== message.content) {
      updateMessage(chat, message.uuid, content);
    }
  }, [chat, message, content]);

  const completions = useCompletions(`idle`);

  const deleteUserMessageCallback = React.useMemo(
    () =>
      message.role === `user` && completions.state === `idle`
        ? () => deleteMessage(chat, message)
        : undefined,
    [chat, message, completions],
  );

  const api = useApi();

  const sendPromptCallback = React.useMemo(
    () =>
      chat.state === `prompted` &&
      message === getLastMessage(chat) &&
      message.content &&
      completions.state === `idle` &&
      api
        ? () => api.sendPrompt(chat, completions)
        : undefined,
    [chat, message, completions, api],
  );

  const resendPromptCallback = React.useMemo(
    () =>
      chat.state === `responded` &&
      message === getLastMessage(chat) &&
      completions.state === `idle` &&
      api
        ? () => api.sendPrompt(deleteMessage(chat, message), completions)
        : undefined,
    [chat, message, completions, api],
  );

  return React.useMemo(
    () => (
      <Container>
        <Container col grow>
          <EditorView ref={setEditor} initialContent={message.content} />
        </Container>

        <Container col>
          {!sendPromptCallback && message.role === `user` && (
            <Button title="Delete message" onClick={deleteUserMessageCallback}>
              <Icon type={TrashIcon} standalone />
            </Button>
          )}

          {sendPromptCallback && (
            <Button title="Send prompt" inverted onClick={sendPromptCallback}>
              <Icon type={PaperAirplaneIcon} standalone />
            </Button>
          )}

          {resendPromptCallback && (
            <Button title="Resend prompt" onClick={resendPromptCallback}>
              <Icon type={ArrowPathIcon} standalone />
            </Button>
          )}

          <MessageIcon role={message.role} />
        </Container>
      </Container>
    ),
    [message, deleteUserMessageCallback, sendPromptCallback, resendPromptCallback],
  );
}
