'use client';

import { Message } from '@langchain/langgraph-sdk';
import { AssistantMessage, AssistantMessageLoading } from '@/components/thread/messages/ai';
import { HumanMessage } from '@/components/thread/messages/human';
import { Badge } from '@/components/ui/badge';
import { StickToBottom } from 'use-stick-to-bottom';

interface ThreadMessagesOnlyProps {
  messages: Message[];
  isLoading?: boolean;
  status?: string;
  currentTurn?: number;
  maxTurns?: number;
  goalAchieved?: boolean;
}

function StickyToBottomContent(props: {
  content: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div className={props.className}>
      <div className={props.contentClassName}>{props.content}</div>
    </div>
  );
}

export function ThreadMessagesOnly({
  messages,
  isLoading = false,
  status = 'idle',
  currentTurn = 0,
  maxTurns = 10,
  goalAchieved,
}: ThreadMessagesOnlyProps) {
  const DO_NOT_RENDER_ID_PREFIX = '__do_not_render__';

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

      {/* Messages using agent-chat-ui components */}
      <StickToBottom className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 overflow-y-scroll px-4">
          <StickyToBottomContent
            className="h-full"
            contentClassName="pt-8 pb-16 max-w-3xl mx-auto flex flex-col gap-4 w-full"
            content={
              <>
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <p className="text-lg font-medium mb-2">
                        Waiting for conversation to start...
                      </p>
                      <p className="text-sm">
                        Messages will appear here once the simulation begins
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages
                      .filter((m) => !m.id?.startsWith(DO_NOT_RENDER_ID_PREFIX))
                      .map((message, index) => {
                        // Get reward from additional_kwargs for color coding
                        const reward = message.additional_kwargs?.reward;
                        const borderColor = 
                          reward === 1 ? 'border-l-4 border-l-green-500' :  // Good response
                          reward === -1 ? 'border-l-4 border-l-red-500' :    // Bad response
                          '';  // Neutral (0) or no reward
                        
                        return message.type === 'human' ? (
                          <div key={message.id || `${message.type}-${index}`} className={borderColor}>
                            <HumanMessage
                              message={message}
                              isLoading={isLoading}
                            />
                          </div>
                        ) : (
                          <div key={message.id || `${message.type}-${index}`} className={borderColor}>
                            <AssistantMessage
                              message={message}
                              isLoading={isLoading}
                              handleRegenerate={() => {}}
                            />
                          </div>
                        );
                      })}
                    {isLoading && <AssistantMessageLoading />}
                  </>
                )}
              </>
            }
          />
        </div>
      </StickToBottom>

      {/* Goal Achievement Banner */}
      {status === 'completed' && (
        <div
          className={`p-4 border-t ${
            goalAchieved
              ? 'bg-green-50 border-green-300'
              : 'bg-yellow-50 border-yellow-300'
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
