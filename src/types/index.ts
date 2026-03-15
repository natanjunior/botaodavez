// src/types/index.ts

export type ButtonState = 'disabled' | 'yellow' | 'green' | 'red' | 'winner' | 'loser'

export type RoundStatus = 'waiting' | 'active' | 'finished' | 'stopped'

// Supabase Realtime Broadcast payloads
export type BroadcastRoundCreated = {
  round: { id: string; status: RoundStatus }
  participants: Array<{ id: string; name: string; avatarSeed: string; teamId: string | null }>
}

export type BroadcastRoundStart = {
  roundPlayId: string
  yellowDurationMs: number
  yellowEndsAt: string // ISO 8601
}

export type BroadcastRoundResult = {
  type: 'winner' | 'tie' | 'no_winner'
  winners: string[] // participantIds
  results: Array<{
    participantId: string
    name: string
    reactionTimeMs: number | null
    eliminated: boolean
    rank: number | null
  }>
}

export type BroadcastRoundStopped = {
  roundId: string
}

export type BroadcastTeamUpdated = {
  teams: Array<{ id: string; name: string; color: string }>
}

export type PresenceParticipant = {
  participantId: string
  name: string
}

// localStorage schema
export type StoredParticipant = {
  participantId: string
  avatarSeed: string
  gameToken: string
}
