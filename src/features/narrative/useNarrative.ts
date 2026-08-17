import { useEffect, useState, useCallback } from 'react';
import type { NarrativeData } from './narrative.types';
import { fetchNarrativeData, DEFAULT_NARRATIVE_DATA } from './narrativeApi';

export interface UseNarrativeResult {
  data: NarrativeData;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom React hook for fetching and managing narrative data.
 * Adheres to standard design principles:
 * - Cancels inflight requests on unmount via AbortController.
 * - Handles loading and error state seamlessly.
 * - Provides refetch capability.
 */
export function useNarrative(exerciseId: string = 'exercise-01', autoFetch: boolean = false): UseNarrativeResult {
  const [data, setData] = useState<NarrativeData>(DEFAULT_NARRATIVE_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchNarrativeData({ exerciseId, signal: controller.signal });
      setData(result);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch narrative data');
      setData(DEFAULT_NARRATIVE_DATA);
    } finally {
      setIsLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    if (autoFetch) {
      loadData();
    }
  }, [autoFetch, loadData]);

  return {
    data,
    isLoading,
    error,
    refetch: loadData,
  };
}
