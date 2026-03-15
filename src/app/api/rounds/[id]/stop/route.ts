// src/app/api/rounds/[id]/stop/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roundId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { game: true },
  })
  if (!round) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })

  await prisma.round.update({ where: { id: roundId }, data: { status: 'stopped' } })

  const serviceClient = await createServiceClient()
  await serviceClient.channel(`game:${round.game.token}`).send({
    type: 'broadcast',
    event: 'round_stopped',
    payload: { roundId },
  })

  return NextResponse.json({ ok: true })
}
