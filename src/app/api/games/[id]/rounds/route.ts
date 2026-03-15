// src/app/api/games/[id]/rounds/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { participantIds } = await req.json()

  if (!Array.isArray(participantIds) || participantIds.length < 2) {
    return NextResponse.json({ error: 'Mínimo de 2 participantes' }, { status: 400 })
  }

  const round = await prisma.round.create({
    data: {
      gameId,
      status: 'waiting',
      roundParticipants: {
        create: participantIds.map((pid: string) => ({ participantId: pid })),
      },
    },
    include: { roundParticipants: { include: { participant: true } } },
  })

  // Broadcast round_created to all clients in this game channel
  const game = await prisma.game.findUnique({ where: { id: gameId } })
  const serviceClient = await createServiceClient()
  await serviceClient.channel(`game:${game!.token}`).send({
    type: 'broadcast',
    event: 'round_created',
    payload: {
      round: { id: round.id, status: round.status },
      participants: round.roundParticipants.map((rp) => ({
        id: rp.participant.id,
        name: rp.participant.name,
        avatarSeed: rp.participant.avatarSeed,
        teamId: rp.teamId,
      })),
    },
  })

  return NextResponse.json({ round })
}
