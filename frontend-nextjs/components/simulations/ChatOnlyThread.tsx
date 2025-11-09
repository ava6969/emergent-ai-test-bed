'use client';

import { Message } from '@langchain/langgraph-sdk';
import { AssistantMessage } from '@/components/thread/messages/ai';
import { HumanMessage } from '@/components/thread/messages/human';
import { Badge } from '@/components/ui/badge';

interface ChatOnlyThreadProps {
  messages: Message[];
  isLoading?: boolean;
  status?: string;
  currentTurn?: number;
  maxTurns?: number;
  goalAchieved?: boolean;
}

export function ChatOnlyThread({
  messages,
  isLoading = false,
  status = 'idle',
  currentTurn = 0,
  maxTurns = 10,
  goalAchieved,
}: ChatOnlyThreadProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Badge
            variant={
              status === 'running'
                ? 'default'
                : status === 'completed'
                  ? 'secondary'
                  : 'destructive'
            }
          >
            {status}
          </Badge>
          {currentTurn > 0 && (
            <Badge variant="outline">
              Turn {currentTurn} / {maxTurns}
            </Badge>
          )}
        </div>
      </div>

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <p className="text-sm">Waiting for conversation to start...</p>
            </div>
          ) : (
            messages.map((message, index) =>
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
            )
          )}
        </div>
      </div>

      {/* Goal Achievement Banner */}
      {status === 'completed' && (
        <div
          className={`p-4 border-t ${
            goalAchieved
              ? 'bg-green-50 border-green-300'
              : 'bg-yellow-50 border-yellow-300'
          }`}
        >
          <span
            className={`font-semibold ${
              goalAchieved ? 'text-green-900' : 'text-yellow-900'
            }`}
          >
            {goalAchieved ? '✓ Goal Achieved!' : '⚠ Goal Not Achieved'}
          </span>
        </div>
      )}
    </div>
  );
}
