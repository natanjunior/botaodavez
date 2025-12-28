import { useState, useEffect, useCallback } from 'react';
import { useSupabaseRealtime } from './useSupabaseRealtime';
import type { RoundResult } from '@/lib/db/schema';

/**
 * Hook to manage round results with real-time updates
 *
 * @param roundId - Round ID to filter results
 * @returns Results array and loading state
 *
 * @example
 * const { results, loading, winner } = useRoundResults(roundId);
 */
export function useRoundResults(roundId: string | null) {
  const [results, setResults] = useState<RoundResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [winner, setWinner] = useState<RoundResult | null>(null);

  // Fetch initial results via API
  useEffect(() => {
    if (!roundId) {
      setResults([]);
      setWinner(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/rounds/${roundId}/result`);
        if (!response.ok) {
          throw new Error('Failed to fetch results');
        }

        const data = await response.json();
        const resultsList = data.results || [];

        if (isMounted) {
          setResults(resultsList);
          // Find winner
          const winnerResult = resultsList.find((r: RoundResult) => r.is_winner);
          setWinner(winnerResult || null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load results');
          console.error('[useRoundResults] Error:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchResults();

    return () => {
      isMounted = false;
    };
  }, [roundId]);

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('[useRoundResults] Realtime update:', payload);

    if (payload.eventType === 'INSERT') {
      setResults((prev) => {
        const exists = prev.some((r) => r.id === payload.new.id);
        if (exists) return prev;
        const newResults = [...prev, payload.new];
        // Sort by reaction time (fastest first)
        return newResults.sort((a, b) => {
          if (a.was_eliminated) return 1;
          if (b.was_eliminated) return -1;
          return (a.reaction_time || 0) - (b.reaction_time || 0);
        });
      });
      // Check if this result is a winner
      if (payload.new.is_winner) {
        setWinner(payload.new);
      }
    } else if (payload.eventType === 'UPDATE') {
      setResults((prev) =>
        prev.map((r) => (r.id === payload.new.id ? payload.new : r))
      );
      // Update winner if needed
      if (payload.new.is_winner) {
        setWinner(payload.new);
      }
    } else if (payload.eventType === 'DELETE') {
      setResults((prev) => prev.filter((r) => r.id !== payload.old.id));
      setWinner((prev) =>
        prev?.id === payload.old.id ? null : prev
      );
    }
  }, []);

  // Subscribe to real-time changes
  useSupabaseRealtime({
    table: 'round_results',
    event: '*',
    filter: roundId ? `round_id=eq.${roundId}` : undefined,
    callback: handleRealtimeUpdate,
  });

  return {
    results,
    winner,
    loading,
    error,
    refetch: useCallback(async () => {
      if (roundId) {
        try {
          const response = await fetch(`/api/rounds/${roundId}/result`);
          if (response.ok) {
            const data = await response.json();
            const resultsList = data.results || [];
            setResults(resultsList);
            const winnerResult = resultsList.find((r: RoundResult) => r.is_winner);
            setWinner(winnerResult || null);
          }
        } catch (err) {
          console.error('[useRoundResults] Refetch error:', err);
        }
      }
    }, [roundId]),
  };
}
