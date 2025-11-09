'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { ThreadMessagesOnly } from '@/components/simulations/ThreadMessagesOnly';
import { Card } from '@/components/ui/card';

export default function SimulationPage() {
  const params = useParams();
  const thread_id = params.thread_id as string;
  const [shouldPoll, setShouldPoll] = useState(true);

  // Poll messages
  const { data: messagesData } = useQuery({
    queryKey: ['thread-messages', thread_id],
    queryFn: () => apiClient.getThreadMessages(thread_id),
    refetchInterval: shouldPoll ? 1000 : false, // Poll every 1 second
    enabled: !!thread_id,
  });

  // Poll status
  const { data: statusData } = useQuery({
    queryKey: ['thread-status', thread_id],
    queryFn: () => apiClient.getThreadStatus(thread_id),
    refetchInterval: shouldPoll ? 1000 : false, // Poll every 1 second
    enabled: !!thread_id,
  });

  // Stop polling when completed
  useEffect(() => {
    if (statusData?.status === 'completed' || statusData?.status === 'failed') {
      setShouldPoll(false);
    }
  }, [statusData?.status]);

  const messages = messagesData?.messages || [];
  const status = statusData?.status || 'running';
  const currentTurn = statusData?.current_turn || 0;
  const maxTurns = statusData?.max_turns || 5;

  // Calculate goal achieved from last message reward
  const lastMsg = messages[messages.length - 1];
  const goalAchieved = lastMsg?.additional_kwargs?.reward === 1;

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <ThreadMessagesOnly
          messages={messages}
          isLoading={status === 'running'}
          status={status}
          currentTurn={currentTurn}
          maxTurns={maxTurns}
          goalAchieved={goalAchieved}
        />
      </Card>
    </div>
  );
}
