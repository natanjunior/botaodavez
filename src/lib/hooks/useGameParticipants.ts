import { useState, useEffect, useCallback } from 'react';
import { useSupabaseRealtime } from './useSupabaseRealtime';
import type { Participant } from '@/lib/db/schema';

/**
 * Hook to manage participants for a game with real-time updates
 *
 * @param gameToken - Game token to filter participants
 * @returns Participants array and loading state
 *
 * @example
 * const { participants, loading, error } = useGameParticipants('ABC123');
 */
export function useGameParticipants(gameToken: string | null) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);

  // Fetch initial participants via API
  useEffect(() => {
    if (!gameToken) {
      setParticipants([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchParticipants = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/participants?game_token=${gameToken}`);
        if (!response.ok) {
          throw new Error('Failed to fetch participants');
        }

        const data = await response.json();
        const participantsList = data.participants || [];

        if (isMounted) {
          setParticipants(participantsList);
          // Extract game_id from first participant for realtime filter
          if (participantsList.length > 0) {
            setGameId(participantsList[0].game_id);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load participants');
          console.error('[useGameParticipants] Error:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchParticipants();

    return () => {
      isMounted = false;
    };
  }, [gameToken]);

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('[useGameParticipants] Realtime update:', payload);

    if (payload.eventType === 'INSERT') {
      setParticipants((prev) => {
        // Check if participant already exists
        const exists = prev.some((p) => p.id === payload.new.id);
        if (exists) return prev;
        return [...prev, payload.new];
      });
    } else if (payload.eventType === 'UPDATE') {
      setParticipants((prev) =>
        prev.map((p) => (p.id === payload.new.id ? payload.new : p))
      );
    } else if (payload.eventType === 'DELETE') {
      setParticipants((prev) => prev.filter((p) => p.id !== payload.old.id));
    }
  }, []);

  // Subscribe to real-time changes
  useSupabaseRealtime({
    table: 'participants',
    event: '*',
    filter: gameId ? `game_id=eq.${gameId}` : undefined,
    callback: handleRealtimeUpdate,
  });

  return {
    participants,
    loading,
    error,
    refetch: useCallback(async () => {
      if (gameToken) {
        try {
          const response = await fetch(`/api/participants?game_token=${gameToken}`);
          if (response.ok) {
            const data = await response.json();
            setParticipants(data.participants || []);
          }
        } catch (err) {
          console.error('[useGameParticipants] Refetch error:', err);
        }
      }
    }, [gameToken]),
  };
}
