// src/app/api/plays/[id]/results/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { finalizeRound } from '@/lib/finalize-round'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roundPlayId } = await params
  const { participantId, reactionTimeMs, eliminated } = await req.json()

  let shouldFinalize = false

  try {
    await prisma.$transaction(async (tx) => {
      const roundPlay = await tx.roundPlay.findUnique({
        where: { id: roundPlayId },
        include: { round: { include: { game: true, roundParticipants: true } }, results: true },
      })

      if (!roundPlay) throw new Error('NOT_FOUND')
      if (roundPlay.finishedAt) throw new Error('ALREADY_DONE')
      if (roundPlay.round.status !== 'active') throw new Error('NOT_ACTIVE')

      // Idempotent: skip if already submitted
      const alreadySubmitted = roundPlay.results.some((r) => r.participantId === participantId)
      if (alreadySubmitted) return

      await tx.roundPlayResult.create({
        data: {
          roundPlayId,
          participantId,
          reactionTimeMs: eliminated ? null : (reactionTimeMs ?? null),
          eliminated: Boolean(eliminated),
        },
      })

      const newCount = roundPlay.results.length + 1
      const expected = roundPlay.round.roundParticipants.length
      if (newCount >= expected) {
        shouldFinalize = true
      }
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'NOT_FOUND') return NextResponse.json({ error: 'Jogada não encontrada' }, { status: 404 })
    if (msg === 'NOT_ACTIVE' || msg === 'ALREADY_DONE') return NextResponse.json({ ok: true })
    throw e
  }

  if (shouldFinalize) {
    const play = await prisma.roundPlay.findUnique({
      where: { id: roundPlayId },
      include: { results: true, round: { include: { game: true } } },
    })
    if (play && !play.finishedAt) {
      await finalizeRound(play.round.id, play.round.game.token, play.results, roundPlayId)
    }
  }

  return NextResponse.json({ ok: true })
}
