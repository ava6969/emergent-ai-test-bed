'use client';

import { Message } from '@langchain/langgraph-sdk';
import { AssistantMessage } from '@/lib/agent-chat-ui/components/thread/messages/ai';
import { HumanMessage } from '@/lib/agent-chat-ui/components/thread/messages/human';

interface ChatOnlyThreadProps {
  messages: Message[];
  isLoading?: boolean;
}

export function ChatOnlyThread({ messages, isLoading = false }: ChatOnlyThreadProps) {
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        <div className="text-center">
          <p>Select a persona and goal to start a simulation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto max-h-[600px] px-4">
      <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto pt-4 pb-4">
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
            <div className="text-gray-500">Starting simulation...</div>
          </div>
        )}
      </div>
    </div>
  );
}
