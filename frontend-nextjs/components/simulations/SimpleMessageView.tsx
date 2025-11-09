'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Bot } from 'lucide-react';

interface Message {
  role: string;
  content: string;
}

interface SimpleMessageViewProps {
  messages: Message[];
  isLoading?: boolean;
  status?: string;
  currentTurn?: number;
  maxTurns?: number;
  goalAchieved?: boolean;
}

export function SimpleMessageView({
  messages,
  isLoading = false,
  status = 'idle',
  currentTurn = 0,
  maxTurns = 10,
  goalAchieved,
}: SimpleMessageViewProps) {
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
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Bot className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">Waiting for conversation to start...</p>
              <p className="text-sm">Messages will appear here once the simulation begins</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-4 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role !== 'user' && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-blue-600" />
                  </div>
                )}
                
                <Card
                  className={`max-w-[70%] p-4 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
                      {message.role === 'user' ? 'Persona' : 'Assistant'}
                    </span>
                    <span className="text-xs opacity-50">
                      Turn {Math.floor(index / 2) + 1}
                    </span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {typeof message.content === 'string'
                      ? message.content
                      : JSON.stringify(message.content, null, 2)}
                  </div>
                </Card>

                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-green-600" />
                  </div>
                )}
              </div>
            ))
          )}
          
          {isLoading && messages.length > 0 && (
            <div className="flex gap-4 justify-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Bot className="w-6 h-6 text-blue-600 animate-pulse" />
              </div>
              <Card className="max-w-[70%] p-4 bg-white border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </Card>
            </div>
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
          <div className="max-w-4xl mx-auto">
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
