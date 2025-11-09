'use client';

import { Message } from '@langchain/langgraph-sdk';
import { AssistantMessage } from './messages/ai';
import { HumanMessage } from './messages/human';

interface ThreadMessagesProps {
  messages: Message[];
  isLoading?: boolean;
}

export function ThreadMessages({ messages, isLoading = false }: ThreadMessagesProps) {
  return (
    <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto pt-8 pb-16">
      {messages.map((message, index) =>
        message.type === 'human' ? (
          <HumanMessage
            key={message.id || `${message.type}-${index}`}
            message={message}
            isLoading={isLoading}
          />
        ) : (
          <AssistantMessage
            key={message.id || `${message.type}-${index}`}
            message={message}
            isLoading={isLoading}
            handleRegenerate={() => {}}
          />
        ),
      )}
      
      {isLoading && messages.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading messages...</div>
        </div>
      )}
    </div>
  );
}
