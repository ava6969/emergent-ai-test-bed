import React, { useRef, useEffect } from 'react';
import { useConversationStore } from '@/lib/stores/conversation-store';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw } from 'lucide-react';

export function ChatInterface() {
  const { messages, isGenerating, resetConversation } = useConversationStore();
  const scrollRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">AI Assistant</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetConversation}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          New Conversation
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <WelcomeMessage />
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isGenerating && <GeneratingIndicator />}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <ChatInput />
      </div>
    </div>
  );
}

function WelcomeMessage() {
  const { sendMessage } = useConversationStore();

  const quickStarts = [
    'Test a customer support agent',
    'Create a technical debugging scenario',
    'Show me my recent tests',
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Test Your LangGraph Agent</h1>
        <p className="text-muted-foreground">
          Describe what you want to test, and I'll help you set it up
        </p>
      </div>

      <div className="space-y-2 w-full max-w-md">
        <p className="text-sm text-muted-foreground">Try asking:</p>
        {quickStarts.map((text, i) => (
          <Button
            key={i}
            variant="outline"
            className="w-full justify-start"
            onClick={() => sendMessage(text)}
          >
            {text}
          </Button>
        ))}
      </div>
    </div>
  );
}

function GeneratingIndicator() {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <div className="flex gap-1">
        <div
          className="w-2 h-2 bg-primary rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <div
          className="w-2 h-2 bg-primary rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <div
          className="w-2 h-2 bg-primary rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span className="text-sm">AI is thinking...</span>
    </div>
  );
}
