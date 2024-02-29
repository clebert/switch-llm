import * as React from 'react';
import { Button, ColorSchemeButton, Container, Icon, Page, Styles, Topbar } from 'wtfkit';
import { ApiContext } from '../contexts/api-context.js';
import { ApiKeyView } from './api-key-view.js';
import { ApiTypeButton } from './api-type-button.js';
import { CompletionsView } from './completions-view.js';
import { FolderOpenIcon } from '@heroicons/react/24/outline';
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
import { useLocalApi } from '../hooks/use-local-api.js';
import { useOpenaiApi } from '../hooks/use-openai-api.js';

export function App(): JSX.Element {
  const styles = React.useMemo(() => new Styles({ neutralGray: true }), []);
  const chat = useChat();
  const completions = useCompletions();
  const [apiType] = useApiType();
  const localApi = useLocalApi();
  const openaiApi = useOpenaiApi();

  const selectModel = React.useCallback(
    () => window.webkit.messageHandlers.selectModel.postMessage(null),
    [],
  );

  return (
    <ApiContext.Provider value={apiType === `local` ? localApi : openaiApi}>
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
              {apiType === `local` ? (
                <>
                  <ModelPathView />

                  <Button title="Select model" onClick={selectModel}>
                    <Icon type={FolderOpenIcon} standalone />
                  </Button>
                </>
              ) : (
                <ApiKeyView />
              )}
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
    </ApiContext.Provider>
  );
}
