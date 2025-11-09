'use client';

import { useParams, useRouter } from 'next/navigation';
import { useStream } from '@langchain/langgraph-sdk/react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { EvaluateTab } from '@/components/simulations/EvaluateTab';
import { MessageRenderer } from '@/components/simulations/MessageRenderer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, User, Bot } from 'lucide-react';
import type { Message } from '@langchain/langgraph-sdk';

export default function SimulationPage() {
  const params = useParams();
  const router = useRouter();
  const thread_id = params.thread_id as string;

  // Get LangGraph API key from env (should be set server-side for security)
  const langGraphApiKey = process.env.NEXT_PUBLIC_LANGGRAPH_API_KEY;

  // Use LangGraph streaming instead of polling
  const stream = useStream<{ messages: Message[] }>({
    apiUrl: process.env.NEXT_PUBLIC_LANGGRAPH_API_URL || '',
    apiKey: langGraphApiKey,
    assistantId: process.env.NEXT_PUBLIC_ASSISTANT_ID || 'epoch-ai',
    messagesKey: 'messages',
    threadId: thread_id,
    fetchStateHistory: true, // Fetch historical messages for completed threads
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
    <div className="h-full flex flex-col p-6">
      {/* Header with New Simulation Button */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Simulation View</h1>
        <Button
          onClick={() => router.push('/')}
          variant="outline"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Simulation
        </Button>
      </div>

      <Tabs defaultValue="trajectory" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0">
          <TabsTrigger 
            value="trajectory"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
          >
            Trajectory
          </TabsTrigger>
          <TabsTrigger 
            value="evaluate"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
          >
            Evaluate
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trajectory" className="flex-1 mt-4">
          <Card className="h-full flex flex-col overflow-hidden">
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
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <Bot className="w-16 h-16 mb-4 text-gray-300" />
                    <p className="text-lg font-medium">Waiting for conversation to start...</p>
                    <p className="text-sm">Messages will appear here once the simulation begins</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const reward = message.additional_kwargs?.reward;
                    const isHuman = message.type === 'human';
                    
                    return (
                      <div
                        key={index}
                        className={`flex gap-4 ${isHuman ? 'justify-start' : 'justify-start'}`}
                      >
                        {/* Avatar */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          isHuman ? 'bg-blue-100' : 'bg-gray-200'
                        }`}>
                          {isHuman ? (
                            <User className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Bot className="w-5 h-5 text-gray-600" />
                          )}
                        </div>

                        {/* Message Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">
                              {isHuman ? 'Persona' : 'Assistant'}
                            </span>
                            {reward !== undefined && reward !== 0 && (
                              <Badge
                                variant={reward === 1 ? 'default' : 'destructive'}
                                className="text-xs"
                              >
                                {reward === 1 ? '+1' : '-1'}
                              </Badge>
                            )}
                          </div>
                          <div className={`prose prose-sm max-w-none ${
                            isHuman ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            <ReactMarkdown>
                              {typeof message.content === 'string'
                                ? message.content
                                : JSON.stringify(message.content, null, 2)}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Loading indicator */}
                {stream.isLoading && messages.length > 0 && (
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-200">
                      <Bot className="w-5 h-5 text-gray-600 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Goal Achievement Banner */}
            {status === 'completed' && (
              <div
                className={`p-4 border-t ${
                  goalAchieved ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'
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
          </Card>
        </TabsContent>

        <TabsContent value="evaluate" className="flex-1 mt-4">
          <div className="h-full overflow-y-auto">
            <EvaluateTab threadId={thread_id} messages={messages} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
