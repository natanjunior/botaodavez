// src/hooks/use-game-channel.ts
'use client'
import { useEffect, useRef } from 'react'
import { createGameChannel } from '@/lib/supabase/realtime'
import type { GameChannelEvents } from '@/lib/supabase/realtime'
import type { RealtimeChannel } from '@supabase/supabase-js'

type Handler<T extends keyof GameChannelEvents> = (payload: GameChannelEvents[T]) => void

export function useGameChannel<T extends keyof GameChannelEvents>(
  token: string,
  event: T,
  handler: Handler<T>
) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const channel = createGameChannel(token)

    channel
      .on('broadcast', { event }, (msg) => {
        handlerRef.current(msg.payload as GameChannelEvents[T])
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [token, event])
}
