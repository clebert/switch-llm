import * as React from 'react';
import type { Chat } from '../machines/chat-machine.js';
import { chatMachine } from '../machines/chat-machine.js';

export function useChat(): Chat {
  return React.useSyncExternalStore(chatMachine.subscribe, () => chatMachine.get());
}
