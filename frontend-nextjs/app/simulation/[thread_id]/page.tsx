'use client';

import { useParams } from 'next/navigation';
import { useStream } from '@langchain/langgraph-sdk/react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { SimpleThreadMessages } from '@/components/simulations/SimpleThreadMessages';
import { Card } from '@/components/ui/card';
import type { Message } from '@langchain/langgraph-sdk';

export default function SimulationPage() {
  const params = useParams();
  const thread_id = params.thread_id as string;

  // Use LangGraph streaming instead of polling
  const stream = useStream<{ messages: Message[] }>({
    apiUrl: process.env.NEXT_PUBLIC_LANGGRAPH_API_URL || '',
    assistantId: process.env.NEXT_PUBLIC_ASSISTANT_ID || 'agent',
    messagesKey: 'messages',
    threadId: thread_id,
  });

  // Still poll status separately (lightweight check for completed/failed)
  const { data: statusData } = useQuery({
    queryKey: ['thread-status', thread_id],
    queryFn: () => apiClient.getThreadStatus(thread_id),
    refetchInterval: stream.isLoading ? 1000 : 5000, // Poll faster while running
    enabled: !!thread_id,
  });

  const messages = stream.messages || [];
  const status = statusData?.status || 'running';
  const currentTurn = statusData?.current_turn || 0;
  const maxTurns = statusData?.max_turns || 5;

  // Calculate goal achieved from last message reward
  const lastMsg = messages[messages.length - 1];
  const goalAchieved = lastMsg?.additional_kwargs?.reward === 1;

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <SimpleThreadMessages
          messages={messages}
          isLoading={stream.isLoading}
          status={status}
          currentTurn={currentTurn}
          maxTurns={maxTurns}
          goalAchieved={goalAchieved}
        />
      </Card>
    </div>
  );
}
