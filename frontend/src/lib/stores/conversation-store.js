import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { apiClient } from '@/lib/api/client';
import { createChatMessage } from '@/types';

export const useConversationStore = create(
  persist(
    (set, get) => ({
      // State
      conversationId: uuidv4(),
      messages: [],
      isGenerating: false,
      currentTask: undefined,
      context: {
        stored_personas: [],
        stored_goals: [],
        recent_simulations: [],
      },

      // Send user message and get AI response
      sendMessage: async (content) => {
        const { conversationId, messages, context } = get();

        // Add user message
        const userMessage = createChatMessage({
          id: uuidv4(),
          role: 'user',
          content,
          timestamp: new Date(),
          type: 'text',
        });

        set({ messages: [...messages, userMessage], isGenerating: true });

        try {
          // Call AI API
          const response = await apiClient.chat(content, conversationId, context);

          // Add AI response
          const aiMessage = createChatMessage({
            id: uuidv4(),
            role: 'assistant',
            content: response.message,
            timestamp: new Date(),
            type: response.generated_items ? 'generation' : 'text',
            actions: response.actions,
            generatedItems: response.generated_items,
          });

          set((state) => ({
            messages: [...state.messages, aiMessage],
            isGenerating: false,
          }));

          // If items were generated, update context
          if (response.generated_items) {
            if (response.generated_items.persona) {
              set((state) => ({
                context: {
                  ...state.context,
                  stored_personas: [
                    ...(state.context.stored_personas || []),
                    response.generated_items.persona,
                  ],
                },
              }));
            }
            if (response.generated_items.goal) {
              set((state) => ({
                context: {
                  ...state.context,
                  stored_goals: [
                    ...(state.context.stored_goals || []),
                    response.generated_items.goal,
                  ],
                },
              }));
            }
          }
        } catch (error) {
          console.error('Error sending message:', error);

          const errorMessage = createChatMessage({
            id: uuidv4(),
            role: 'assistant',
            content: '❌ Sorry, I encountered an error. Please try again.',
            timestamp: new Date(),
            type: 'text',
          });

          set((state) => ({
            messages: [...state.messages, errorMessage],
            isGenerating: false,
          }));
        }
      },

      // Add message directly (for system messages, etc.)
      addMessage: (message) => {
        set((state) => ({
          messages: [...state.messages, message],
        }));
      },

      // Set generating state
      setGenerating: (isGenerating) => {
        set({ isGenerating });
      },

      // Update context
      setContext: (newContext) => {
        set((state) => ({
          context: { ...state.context, ...newContext },
        }));
      },

      // Reset conversation
      resetConversation: () => {
        set({
          conversationId: uuidv4(),
          messages: [],
          isGenerating: false,
          currentTask: undefined,
        });
      },

      // Execute action button
      executeAction: async (action, data) => {
        const handlers = {
          run_test: async () => {
            // Will implement in Sprint 3
            console.log('Run test:', data);
          },
          view_details: async () => {
            // Navigate to details view
            console.log('View details:', data);
          },
          regenerate: async () => {
            // Regenerate with same prompt
            await get().sendMessage('Regenerate the previous item');
          },
          refine: async () => {
            // Open refinement dialog
            console.log('Refine:', data);
          },
        };

        const handler = handlers[action];
        if (handler) {
          await handler();
        }
      },
    }),
    {
      name: 'conversation-storage',
      partialize: (state) => ({
        conversationId: state.conversationId,
        messages: state.messages,
        context: state.context,
      }),
    }
  )
);
