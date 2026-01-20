import { useState, useEffect, useCallback } from 'react';

interface QueuedRequest {
  id: string;
  prompt: string;
  model?: string;
  timestamp: number;
  retries: number;
}

const STORAGE_KEY = 'regis_offline_queue';
const MAX_RETRIES = 3;

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedRequest[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [processing, setProcessing] = useState(false);

  // Load queue from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setQueue(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse offline queue:', e);
      }
    }
  }, []);

  // Save queue to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }, [queue]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const enqueue = useCallback((prompt: string, model?: string) => {
    const request: QueuedRequest = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      prompt,
      model,
      timestamp: Date.now(),
      retries: 0
    };

    setQueue(prev => [...prev, request]);
    return request.id;
  }, []);

  const dequeue = useCallback((id: string) => {
    setQueue(prev => prev.filter(r => r.id !== id));
  }, []);

  const incrementRetry = useCallback((id: string) => {
    setQueue(prev => prev.map(r =>
      r.id === id ? { ...r, retries: r.retries + 1 } : r
    ));
  }, []);

  const processQueue = useCallback(async (
    executor: (prompt: string, model?: string) => Promise<void>
  ) => {
    if (!isOnline || processing || queue.length === 0) return;

    setProcessing(true);

    for (const request of queue) {
      if (request.retries >= MAX_RETRIES) {
        dequeue(request.id);
        continue;
      }

      try {
        await executor(request.prompt, request.model);
        dequeue(request.id);
      } catch (error) {
        incrementRetry(request.id);
        console.error('Failed to process queued request:', error);
      }
    }

    setProcessing(false);
  }, [isOnline, processing, queue, dequeue, incrementRetry]);

  return {
    queue,
    isOnline,
    processing,
    queueLength: queue.length,
    enqueue,
    dequeue,
    processQueue,
    clearQueue: () => setQueue([])
  };
}
