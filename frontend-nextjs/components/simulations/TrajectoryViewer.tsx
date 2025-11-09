'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, MessageSquare } from 'lucide-react';

interface Message {
  role: string;
  content: string;
}

interface TrajectoryViewerProps {
  messages: Message[];
  status: string;
  currentTurn: number;
  maxTurns: number;
  goalAchieved?: boolean;
}

export function TrajectoryViewer({
  messages,
  status,
  currentTurn,
  maxTurns,
  goalAchieved,
}: TrajectoryViewerProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge 
            variant={
              status === 'running' ? 'default' :
              status === 'completed' ? 'secondary' :
              'destructive'
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

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <p className="text-sm">Waiting for conversation to start...</p>
          </div>
        ) : (
          messages.map((message, idx) => (
            <Card
              key={idx}
              className={`p-4 ${
                message.role === 'user'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 p-2 rounded-full ${
                    message.role === 'user' ? 'bg-blue-200' : 'bg-gray-300'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-blue-900" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-gray-700" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {message.role === 'user' ? 'Persona' : 'Assistant'}
                    </span>
                    <span className="text-xs text-gray-500">
                      Turn {Math.floor(idx / 2) + 1}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {typeof message.content === 'string'
                      ? message.content
                      : JSON.stringify(message.content, null, 2)}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {status === 'completed' && (
        <Card
          className={`p-4 border-2 ${
            goalAchieved
              ? 'bg-green-50 border-green-300'
              : 'bg-yellow-50 border-yellow-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${
              goalAchieved ? 'text-green-900' : 'text-yellow-900'
            }`}>
              {goalAchieved ? '✓ Goal Achieved!' : '⚠ Goal Not Achieved'}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
