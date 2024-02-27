import * as React from 'react';
import type { IdleCompletions } from '../machines/completions-machine.js';
import type { PromptedChat } from '../machines/chat-machine.js';

export interface Api {
  sendPrompt: (chat: PromptedChat, completions: IdleCompletions) => void;
}

export const ApiContext = React.createContext<Api | undefined>(undefined);
