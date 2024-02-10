import * as React from 'react';
import { ChatBubbleLeftEllipsisIcon, UserIcon } from '@heroicons/react/24/outline';
import { StandaloneIcon } from 'wtfkit';

export interface MessageIconProps {
  role: 'assistant' | 'user';
}

const titles = { assistant: `Assistant`, user: `User` };
const iconTypes = { assistant: ChatBubbleLeftEllipsisIcon, user: UserIcon } as const;

export function MessageIcon({ role }: MessageIconProps): JSX.Element {
  return <StandaloneIcon type={iconTypes[role]} title={titles[role]} />;
}
