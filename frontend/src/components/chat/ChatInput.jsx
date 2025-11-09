import React, { useState, useRef } from 'react';
import { useConversationStore } from '@/lib/stores/conversation-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

export function ChatInput() {
  const [input, setInput] = useState('');
  const { sendMessage, isGenerating } = useConversationStore();
  const textareaRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const message = input.trim();
    setInput('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await sendMessage(message);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  const handleInput = (e) => {
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
    setInput(target.value);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <Textarea
        ref={textareaRef}
        value={input}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Type your message... (Shift+Enter for new line)"
        disabled={isGenerating}
        className="min-h-[60px] max-h-[200px] resize-none"
        rows={1}
      />
      <Button
        type="submit"
        disabled={!input.trim() || isGenerating}
        size="icon"
        className="h-[60px] w-[60px] shrink-0"
      >
        <Send className="h-5 w-5" />
      </Button>
    </form>
  );
}
