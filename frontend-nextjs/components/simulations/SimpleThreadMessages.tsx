'use client';

import { Badge } from '@/components/ui/badge';
import { User, Bot } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { StickToBottom } from 'use-stick-to-bottom';

interface Message {
  type: string;
  content: string;
  additional_kwargs?: {
    reward?: number;
    stop?: boolean;
  };
}

interface SimpleThreadMessagesProps {
  messages: Message[];
  isLoading?: boolean;
  status?: string;
  currentTurn?: number;
  maxTurns?: number;
  goalAchieved?: boolean;
}

function StickyContent({ content, className }: { content: React.ReactNode; className?: string }) {
  return <div className={className}>{content}</div>;
}

export function SimpleThreadMessages({
  messages,
  isLoading = false,
  status = 'idle',
  currentTurn = 0,
  maxTurns = 10,
  goalAchieved,
}: SimpleThreadMessagesProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
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

      {/* Messages Area */}
      <StickToBottom className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 overflow-y-scroll px-4">
          <StickyContent
            className="h-full"
            content={
              <div className="pt-8 pb-16 max-w-3xl mx-auto flex flex-col gap-4 w-full">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <Bot className="w-16 h-16 mb-4 text-gray-300" />
                    <p className="text-lg font-medium">Waiting for conversation to start...</p>
                    <p className="text-sm">Messages will appear here once the simulation begins</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const reward = message.additional_kwargs?.reward;
                    const borderColorClass =
                      reward === 1
                        ? 'border-l-4 border-l-green-500'
                        : reward === -1
                          ? 'border-l-4 border-l-red-500'
                          : '';

                    return (
                      <Card
                        key={index}
                        className={`p-4 ${borderColorClass} ${
                          message.type === 'human'
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-1 p-2 rounded-full flex-shrink-0 ${
                              message.type === 'human' ? 'bg-blue-200' : 'bg-gray-200'
                            }`}
                          >
                            {message.type === 'human' ? (
                              <User className="w-4 h-4 text-blue-900" />
                            ) : (
                              <Bot className="w-4 h-4 text-gray-700" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {message.type === 'human' ? 'Persona' : 'Assistant'}
                              </span>
                              <span className="text-xs text-gray-500">
                                Turn {Math.floor(index / 2) + 1}
                              </span>
                              {reward !== undefined && reward !== 0 && (
                                <Badge
                                  variant={reward === 1 ? 'default' : 'destructive'}
                                  className="text-xs"
                                >
                                  {reward === 1 ? '✓ Good' : '✗ Bad'}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                              {typeof message.content === 'string'
                                ? message.content
                                : JSON.stringify(message.content, null, 2)}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}

                {isLoading && messages.length > 0 && (
                  <div className="flex gap-4 justify-start">
                    <div className="flex-shrink-0 p-2 rounded-full bg-gray-200">
                      <Bot className="w-4 h-4 text-gray-700 animate-pulse" />
                    </div>
                    <Card className="p-4 bg-white border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" />
                        <div
                          className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"
                          style={{ animationDelay: '0.1s' }}
                        />
                        <div
                          className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"
                          style={{ animationDelay: '0.2s' }}
                        />
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            }
          />
        </div>
      </StickToBottom>

      {/* Goal Achievement Banner */}
      {status === 'completed' && (
        <div
          className={`p-4 border-t ${
            goalAchieved ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'
          }`}
        >
          <div className="max-w-3xl mx-auto">
            <span
              className={`font-semibold text-lg ${
                goalAchieved ? 'text-green-900' : 'text-yellow-900'
              }`}
            >
              {goalAchieved ? '✓ Goal Achieved!' : '⚠ Goal Not Achieved'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
