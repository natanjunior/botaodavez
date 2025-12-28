import { useState, useEffect, useCallback } from 'react';
import { useSupabaseRealtime } from './useSupabaseRealtime';
import type { Round } from '@/lib/db/schema';

/**
 * Hook to manage rounds for a game with real-time updates
 *
 * @param gameTokenOrId - Game token or ID to filter rounds
 * @returns Rounds array, current round, and loading state
 *
 * @example
 * const { rounds, currentRound, loading } = useGameRounds('ABC123');
 */
export function useGameRounds(gameTokenOrId: string | null) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);

  // Fetch initial rounds via API
  useEffect(() => {
    if (!gameTokenOrId) {
      setRounds([]);
      setCurrentRound(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchRounds = async () => {
      try {
        setLoading(true);
        setError(null);

        // API expects game_token, so we use gameTokenOrId
        const response = await fetch(`/api/rounds?game_token=${gameTokenOrId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch rounds');
        }

        const data = await response.json();
        const roundsList = data.rounds || [];

        if (isMounted) {
          setRounds(roundsList);
          // Find current active round (waiting or in_progress)
          const active = roundsList.find(
            (r: Round) => r.status === 'waiting' || r.status === 'in_progress'
          );
          setCurrentRound(active || null);

          // Extract game_id from first round for realtime filter
          if (roundsList.length > 0) {
            setGameId(roundsList[0].game_id);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load rounds');
          console.error('[useGameRounds] Error:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRounds();

    return () => {
      isMounted = false;
    };
  }, [gameTokenOrId]);

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('[useGameRounds] Realtime update:', payload);

    if (payload.eventType === 'INSERT') {
      setRounds((prev) => {
        const exists = prev.some((r) => r.id === payload.new.id);
        if (exists) return prev;
        return [...prev, payload.new];
      });
      // If new round is waiting or in_progress, set as current
      if (payload.new.status === 'waiting' || payload.new.status === 'in_progress') {
        setCurrentRound(payload.new);
      }
    } else if (payload.eventType === 'UPDATE') {
      setRounds((prev) =>
        prev.map((r) => (r.id === payload.new.id ? payload.new : r))
      );
      // Update current round if it's the one being updated
      setCurrentRound((prev) =>
        prev?.id === payload.new.id ? payload.new : prev
      );
    } else if (payload.eventType === 'DELETE') {
      setRounds((prev) => prev.filter((r) => r.id !== payload.old.id));
      setCurrentRound((prev) =>
        prev?.id === payload.old.id ? null : prev
      );
    }
  }, []);

  // Subscribe to real-time changes
  useSupabaseRealtime({
    table: 'rounds',
    event: '*',
    filter: gameId ? `game_id=eq.${gameId}` : undefined,
    callback: handleRealtimeUpdate,
  });

  return {
    rounds,
    currentRound,
    loading,
    error,
    refetch: useCallback(async () => {
      if (gameTokenOrId) {
        try {
          const response = await fetch(`/api/rounds?game_token=${gameTokenOrId}`);
          if (response.ok) {
            const data = await response.json();
            const roundsList = data.rounds || [];
            setRounds(roundsList);
            const active = roundsList.find(
              (r: Round) => r.status === 'waiting' || r.status === 'in_progress'
            );
            setCurrentRound(active || null);
          }
        } catch (err) {
          console.error('[useGameRounds] Refetch error:', err);
        }
      }
    }, [gameTokenOrId]),
  };
}
