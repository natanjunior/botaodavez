import { useEffect } from 'react';
import { supabase } from '@/lib/db/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimeCallback<T = any> {
  (payload: RealtimePostgresChangesPayload<T>): void;
}

export interface UseRealtimeOptions {
  table: string;
  event: RealtimeEvent | '*';
  filter?: string;
  callback: RealtimeCallback;
}

/**
 * Base hook for Supabase Realtime subscriptions
 *
 * @example
 * useSupabaseRealtime({
 *   table: 'participants',
 *   event: '*',
 *   filter: `game_id=eq.${gameId}`,
 *   callback: (payload) => {
 *     console.log('Participant changed:', payload);
 *   }
 * });
 */
export function useSupabaseRealtime({
  table,
  event,
  filter,
  callback,
}: UseRealtimeOptions) {
  useEffect(() => {
    // Create channel for this subscription
    const channelName = filter
      ? `${table}:${filter}:${Date.now()}`
      : `${table}:${Date.now()}`;

    const channel: RealtimeChannel = supabase.channel(channelName);

    // Subscribe to changes
    if (filter) {
      channel.on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          filter,
        },
        callback
      );
    } else {
      channel.on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
        },
        callback
      );
    }

    // Subscribe to channel
    channel.subscribe((status) => {
      console.log(`[Realtime] ${channelName} subscription status:`, status);
    });

    // Cleanup on unmount
    return () => {
      console.log(`[Realtime] Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [table, event, filter, callback]);
}
