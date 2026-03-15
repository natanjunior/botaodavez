// src/lib/finalize-round.ts
import { prisma } from '@/lib/prisma'
import { calculateRoundResult } from '@/lib/game-logic'
import { createServiceClient } from '@/lib/supabase/server'

export async function finalizeRound(
  roundId: string,
  gameToken: string,
  results: Array<{ participantId: string; reactionTimeMs: number | null; eliminated: boolean }>,
  roundPlayId: string
) {
  // Atomic guard: only one caller wins the race — the one that sets finishedAt
  const updated = await prisma.roundPlay.updateMany({
    where: { id: roundPlayId, finishedAt: null },
    data: { finishedAt: new Date() },
  })
  if (updated.count === 0) return // already finalised by a concurrent call

  const outcome = calculateRoundResult(results)

  await Promise.all(
    outcome.results.map((r) =>
      prisma.roundPlayResult.updateMany({
        where: { roundPlayId, participantId: r.participantId },
        data: { rank: r.rank },
      })
    )
  )

  await prisma.round.update({ where: { id: roundId }, data: { status: 'finished' } })

  const participants = await prisma.participant.findMany({
    where: { id: { in: results.map((r) => r.participantId) } },
  })

  const serviceClient = await createServiceClient()
  await serviceClient.channel(`game:${gameToken}`).send({
    type: 'broadcast',
    event: 'round_result',
    payload: {
      type: outcome.type,
      winners: outcome.winners,
      results: outcome.results.map((r) => ({
        ...r,
        name: participants.find((p) => p.id === r.participantId)?.name ?? '',
      })),
    },
  })
}
