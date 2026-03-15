// src/hooks/use-presence.ts
'use client'
import { useEffect, useState, useRef } from 'react'
import { createGameChannel } from '@/lib/supabase/realtime'
import type { PresenceParticipant } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function usePresence(token: string, self: PresenceParticipant | null) {
  const [online, setOnline] = useState<PresenceParticipant[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!self) return

    const channel = createGameChannel(token)
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceParticipant>()
        const participants = Object.values(state).flat()
        setOnline(participants)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(self)
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [token, self])

  return { online, onlineIds: online.map((p) => p.participantId) }
}
