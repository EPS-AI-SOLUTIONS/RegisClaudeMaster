import { useState, useCallback, useRef } from 'react';

interface OptimisticState<T> {
  data: T;
  pending: boolean;
  error: Error | null;
  rollback: () => void;
}

export function useOptimisticUpdate<T>(initialData: T) {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    pending: false,
    error: null,
    rollback: () => {}
  });

  const previousData = useRef<T>(initialData);

  const optimisticUpdate = useCallback(
    async (
      optimisticData: T,
      asyncFn: () => Promise<T>
    ): Promise<T> => {
      // Store previous for rollback
      previousData.current = state.data;

      // Optimistically update
      setState({
        data: optimisticData,
        pending: true,
        error: null,
        rollback: () => setState(prev => ({ ...prev, data: previousData.current, pending: false }))
      });

      try {
        const result = await asyncFn();
        setState({
          data: result,
          pending: false,
          error: null,
          rollback: () => {}
        });
        return result;
      } catch (error) {
        // Rollback on error
        setState({
          data: previousData.current,
          pending: false,
          error: error as Error,
          rollback: () => {}
        });
        throw error;
      }
    },
    [state.data]
  );

  return {
    ...state,
    optimisticUpdate
  };
}

// Hook for optimistic chat messages
export function useOptimisticMessages() {
  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    pending?: boolean;
    error?: boolean;
  }>>([]);

  const addOptimisticMessage = useCallback((content: string) => {
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content,
      pending: false
    };

    const assistantPlaceholder = {
      id: `assistant-${Date.now()}`,
      role: 'assistant' as const,
      content: '',
      pending: true
    };

    setMessages(prev => [...prev, userMessage, assistantPlaceholder]);

    return assistantPlaceholder.id;
  }, []);

  const updateAssistantMessage = useCallback((id: string, content: string, done: boolean = false) => {
    setMessages(prev => prev.map(msg =>
      msg.id === id ? { ...msg, content, pending: !done } : msg
    ));
  }, []);

  const markError = useCallback((id: string) => {
    setMessages(prev => prev.map(msg =>
      msg.id === id ? { ...msg, pending: false, error: true } : msg
    ));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    addOptimisticMessage,
    updateAssistantMessage,
    markError,
    clearMessages,
    setMessages
  };
}
