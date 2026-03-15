// src/app/api/rounds/[id]/plays/route.ts
import { NextRequest, NextResponse, after } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { generateYellowDuration, calculateYellowEndsAt } from '@/lib/timing'
import { validateRoundTransition } from '@/lib/round'
import { finalizeRound } from '@/lib/finalize-round'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roundId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { game: true, roundParticipants: true },
  })
  if (!round) return NextResponse.json({ error: 'Rodada não encontrada' }, { status: 404 })

  const transition = validateRoundTransition(round.status as 'waiting' | 'active' | 'finished' | 'stopped', 'active')
  if (!transition.valid) {
    return NextResponse.json({ error: transition.reason }, { status: 409 })
  }

  const yellowDurationMs = generateYellowDuration()
  const yellowEndsAt = calculateYellowEndsAt(yellowDurationMs)

  const roundPlay = await prisma.roundPlay.create({
    data: { roundId, yellowDurationMs, yellowEndsAt },
  })
  await prisma.round.update({ where: { id: roundId }, data: { status: 'active' } })

  const serviceClient = await createServiceClient()
  await serviceClient.channel(`game:${round.game.token}`).send({
    type: 'broadcast',
    event: 'round_start',
    payload: {
      roundPlayId: roundPlay.id,
      yellowDurationMs,
      yellowEndsAt: yellowEndsAt.toISOString(),
    },
  })

  // Schedule timeout: if not all results arrive, finalise with missing participants
  const timeoutMs = yellowDurationMs + 10000
  after(async () => {
    await new Promise((resolve) => setTimeout(resolve, timeoutMs))
    const play = await prisma.roundPlay.findUnique({
      where: { id: roundPlay.id },
      include: { results: true, round: { include: { roundParticipants: true, game: true } } },
    })
    if (!play || play.finishedAt) return // already finalised
    if (play.round.status !== 'active') return

    // Fill in missing results as no-result (not eliminated, no time)
    const submittedIds = new Set(play.results.map((r) => r.participantId))
    const missing = play.round.roundParticipants.filter((rp) => !submittedIds.has(rp.participantId))
    if (missing.length > 0) {
      await prisma.roundPlayResult.createMany({
        data: missing.map((rp) => ({
          roundPlayId: play.id,
          participantId: rp.participantId,
          reactionTimeMs: null,
          eliminated: false,
        })),
        skipDuplicates: true,
      })
    }

    const allResults = await prisma.roundPlayResult.findMany({ where: { roundPlayId: play.id } })
    await finalizeRound(play.round.id, play.round.game.token, allResults, play.id)
  })

  return NextResponse.json({ roundPlay: { ...roundPlay, yellowEndsAt: yellowEndsAt.toISOString() } })
}
