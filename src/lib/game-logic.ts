// src/lib/game-logic.ts
export type ParticipantResult = {
  participantId: string
  reactionTimeMs: number | null
  eliminated: boolean
}

export type RankedResult = ParticipantResult & { rank: number | null }

export type RoundOutcome = {
  type: 'winner' | 'tie' | 'no_winner'
  winners: string[]
  results: RankedResult[]
}

export function calculateRoundResult(results: ParticipantResult[]): RoundOutcome {
  const active = results.filter((r) => !r.eliminated && r.reactionTimeMs !== null)

  if (active.length === 0) {
    return {
      type: 'no_winner',
      winners: [],
      results: results.map((r) => ({ ...r, rank: null })),
    }
  }

  const sorted = [...active].sort((a, b) => a.reactionTimeMs! - b.reactionTimeMs!)
  const minTime = sorted[0]!.reactionTimeMs!
  const winners = sorted
    .filter((r) => r.reactionTimeMs === minTime)
    .map((r) => r.participantId)

  const rankedResults: RankedResult[] = results.map((r) => {
    if (r.eliminated || r.reactionTimeMs === null) return { ...r, rank: null }
    const rank = sorted.findIndex((s) => s.participantId === r.participantId) + 1
    return { ...r, rank }
  })

  return {
    type: winners.length > 1 ? 'tie' : 'winner',
    winners,
    results: rankedResults,
  }
}
