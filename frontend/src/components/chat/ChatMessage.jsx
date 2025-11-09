import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Bot } from 'lucide-react';
import { useConversationStore } from '@/lib/stores/conversation-store';
import { format } from 'date-fns';

export function ChatMessage({ message }) {
  const { executeAction } = useConversationStore();
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-lg p-3 ${
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {/* Generated Items Preview */}
        {message.generatedItems && (
          <div className="space-y-2 w-full">
            {message.generatedItems.persona && (
              <GeneratedPersonaCard persona={message.generatedItems.persona} />
            )}
            {message.generatedItems.goal && (
              <GeneratedGoalCard goal={message.generatedItems.goal} />
            )}
            {message.generatedItems.config && (
              <GeneratedConfigCard config={message.generatedItems.config} />
            )}
          </div>
        )}

        {/* Action Buttons */}
        {message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.actions.map((action, i) => (
              <Button
                key={i}
                variant={action.variant || 'secondary'}
                size="sm"
                onClick={() => executeAction(action.action, action.data)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}

        <span className="text-xs text-muted-foreground">
          {format(new Date(message.timestamp), 'HH:mm')}
        </span>
      </div>

      {isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

function GeneratedPersonaCard({ persona }) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">Persona Generated</Badge>
        <span className="text-sm text-muted-foreground">{persona.id}</span>
      </div>
      <h4 className="font-semibold">{persona.name}</h4>
      <p className="text-sm text-muted-foreground line-clamp-2">{persona.background}</p>
    </Card>
  );
}

function GeneratedGoalCard({ goal }) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">Goal Generated</Badge>
        <span className="text-sm text-muted-foreground">{goal.id}</span>
      </div>
      <h4 className="font-semibold">{goal.name}</h4>
      <p className="text-sm text-muted-foreground">{goal.objective}</p>
      <div className="flex items-center gap-2 text-sm">
        <span>Max turns: {goal.max_turns}</span>
      </div>
    </Card>
  );
}

function GeneratedConfigCard({ config }) {
  return (
    <Card className="p-4 space-y-2">
      <Badge variant="secondary">Configuration</Badge>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Model:</span> {config.model}
        </div>
        <div>
          <span className="text-muted-foreground">Memory:</span>{' '}
          {config.use_memory ? 'Enabled' : 'Disabled'}
        </div>
        <div>
          <span className="text-muted-foreground">Max Turns:</span> {config.max_turns}
        </div>
      </div>
    </Card>
  );
}
