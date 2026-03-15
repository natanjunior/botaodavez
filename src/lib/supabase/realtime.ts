// src/lib/supabase/realtime.ts
import { createClient } from './client'
import type {
  BroadcastRoundCreated,
  BroadcastRoundStart,
  BroadcastRoundResult,
  BroadcastRoundStopped,
  BroadcastTeamUpdated,
} from '@/types'

export type GameChannelEvents = {
  round_created: BroadcastRoundCreated
  round_start: BroadcastRoundStart
  round_result: BroadcastRoundResult
  round_stopped: BroadcastRoundStopped
  team_updated: BroadcastTeamUpdated
}

export function createGameChannel(token: string) {
  const supabase = createClient()
  return supabase.channel(`game:${token}`)
}
