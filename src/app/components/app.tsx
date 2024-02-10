import * as React from 'react';
import { ColorSchemeButton, Container, Page, Styles, Topbar } from 'wtfkit';
import { ApiKeyView } from './api-key-view.js';
import { ApiTypeButton } from './api-type-button.js';
import { CompletionsView } from './completions-view.js';
import { MessageView } from './message-view.js';
import { ModelPathView } from './model-path-view.js';
import { OpenaiModelButton } from './openai-model-button.js';
import { PromptView } from './prompt-view.js';
import { TemperatureButton } from './temperature-button.js';
import { TemplateButton } from './template-button.js';
import { TopPButton } from './top-p-button.js';
import { useApiType } from '../hooks/use-api-type.js';
import { useChat } from '../hooks/use-chat.js';
import { useCompletions } from '../hooks/use-completions.js';

export function App(): JSX.Element {
  const styles = React.useMemo(() => new Styles({ neutralGray: true }), []);
  const chat = useChat();
  const completions = useCompletions();
  const [apiType] = useApiType();

  return (
    <Page styles={styles}>
      <Topbar>
        <Container>
          <ApiTypeButton />
          {apiType === `local` ? <TemplateButton /> : <OpenaiModelButton />}
        </Container>

        <Container grow>
          <Container grow>
            <TemperatureButton />
            <TopPButton />
            {apiType === `local` ? <ModelPathView /> : <ApiKeyView />}
          </Container>

          <Container>
            <ColorSchemeButton />
          </Container>
        </Container>
      </Topbar>

      {chat.state !== `empty` &&
        chat.value.messages?.map((message) => (
          <MessageView key={message.uuid} chat={chat} message={message} />
        ))}

      {(chat.state === `empty` || chat.state === `responded`) && completions.state === `idle` && (
        <PromptView chat={chat} completions={completions} />
      )}

      {(completions.state === `fetching` || completions.state === `streaming`) && (
        <CompletionsView completions={completions} />
      )}
    </Page>
  );
}
