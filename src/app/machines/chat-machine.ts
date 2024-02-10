import type { InferSnapshot } from 'state-guard';
import { completionsMachine } from './completions-machine.js';
import { createJsonStorageItem } from 'wtfkit';
import { createMachine } from 'state-guard';
import { z } from 'zod';

export interface ChatMessage<TRole> {
  readonly uuid: string;
  readonly role: TRole;
  readonly content: string;
}

export interface PromptedValue {
  readonly messages: readonly [
    ...(ChatMessage<'assistant'> | ChatMessage<'user'>)[],
    ChatMessage<'user'>,
  ];
}

export interface RespondedValue {
  readonly messages: readonly [
    ...(ChatMessage<'assistant'> | ChatMessage<'user'>)[],
    ChatMessage<'assistant'>,
  ];
}

export type Chat = InferSnapshot<typeof chatMachine>;
export type EmptyChat = InferSnapshot<typeof chatMachine, 'empty'>;
export type PromptedChat = InferSnapshot<typeof chatMachine, 'prompted'>;
export type RespondedChat = InferSnapshot<typeof chatMachine, 'responded'>;

export const chatMachine = createMachine({
  initialState: `empty`,
  initialValue: undefined,

  transformerMap: {
    empty: () => undefined,
    prompted: (value: PromptedValue) => value,
    responded: (value: RespondedValue) => value,
  },

  transitionsMap: {
    empty: { toPrompted: `prompted`, toResponded: `responded` },
    prompted: { toEmpty: `empty`, toPrompted: `prompted`, toResponded: `responded` },
    responded: { toEmpty: `empty`, toPrompted: `prompted`, toResponded: `responded` },
  },
});

export function getLastMessage<TChat extends PromptedChat | RespondedChat>(
  chat: TChat,
): TChat extends PromptedChat ? ChatMessage<'user'> : ChatMessage<'assistant'> {
  return chat.value.messages[chat.value.messages.length - 1] as any;
}

export function appendAssistantMessage(chat: PromptedChat, content: string): RespondedChat {
  const message: ChatMessage<'assistant'> = {
    uuid: crypto.randomUUID(),
    role: `assistant`,
    content,
  };

  return chat.actions.toResponded({ messages: [...chat.value.messages, message] });
}

export function appendUserMessage(chat: EmptyChat | RespondedChat, content: string): PromptedChat {
  const message: ChatMessage<'user'> = { uuid: crypto.randomUUID(), role: `user`, content };

  return chat.actions.toPrompted({
    messages: chat.state === `empty` ? [message] : [...chat.value.messages, message],
  });
}

export function deleteMessage<TChat extends PromptedChat | RespondedChat>(
  chat: TChat,
  message: ChatMessage<'assistant'> | ChatMessage<'user'>,
): TChat extends PromptedChat ? Chat : PromptedChat {
  const index = chat.value.messages.indexOf(message);

  if (index < 0) {
    throw new Error(`illegal argument`);
  }

  const messages = chat.value.messages.slice(0, index);

  return (
    endsWithAssistantMessage(messages)
      ? chat.actions.toResponded({ messages })
      : endsWithUserMessage(messages)
        ? chat.actions.toPrompted({ messages })
        : chat.actions.toEmpty()
  ) as any;
}

function endsWithAssistantMessage(
  messages: readonly (ChatMessage<'assistant'> | ChatMessage<'user'>)[],
): messages is readonly [
  ...(ChatMessage<'assistant'> | ChatMessage<'user'>)[],
  ChatMessage<'assistant'>,
] {
  return messages[messages.length - 1]?.role === `assistant`;
}

function endsWithUserMessage(
  messages: readonly (ChatMessage<'assistant'> | ChatMessage<'user'>)[],
): messages is readonly [
  ...(ChatMessage<'assistant'> | ChatMessage<'user'>)[],
  ChatMessage<'user'>,
] {
  return messages[messages.length - 1]?.role === `user`;
}

export function updateMessage<TChat extends PromptedChat | RespondedChat>(
  chat: TChat,
  uuid: string,
  content: string,
): TChat {
  const messages = chat.value.messages.map((message) =>
    message.uuid === uuid ? { ...message, content } : message,
  ) as any;

  return (
    chat.state === `prompted`
      ? chat.actions.toPrompted({ messages })
      : chat.actions.toResponded({ messages })
  ) as any;
}

completionsMachine.subscribe(() => {
  const completions = completionsMachine.get(`idle`);
  const chat = chatMachine.get(`prompted`);

  if (completions && completions.value.content && chat) {
    appendAssistantMessage(chat, completions.value.content);
  }
});

const messagesStorageItem = createJsonStorageItem<
  readonly (ChatMessage<'assistant'> | ChatMessage<'user'>)[]
>(
  `messages`,
  z.array(
    z.object({
      uuid: z.string().uuid(),
      role: z.literal(`assistant`).or(z.literal(`user`)),
      content: z.string(),
    }),
  ),
);

{
  const messages = messagesStorageItem.value;

  if (messages) {
    if (endsWithAssistantMessage(messages)) {
      chatMachine.assert(`empty`).actions.toResponded({ messages });
    } else if (endsWithUserMessage(messages)) {
      chatMachine.assert(`empty`).actions.toPrompted({ messages });
    }
  }
}

chatMachine.subscribe(() => {
  const chat = chatMachine.get();

  messagesStorageItem.value = chat.value?.messages;
});
