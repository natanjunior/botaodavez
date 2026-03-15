// src/app/api/games/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const game = await prisma.game.findUnique({
    where: { token: token.toUpperCase() },
    include: {
      teams: true,
      participants: true,
      // Include active round data for client reconnect state restoration
      rounds: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          roundParticipants: { include: { participant: true } },
          roundPlays: { orderBy: { startedAt: 'desc' }, take: 1 },
        },
      },
    },
  })

  if (!game) {
    return NextResponse.json({ error: 'Game não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ game })
}
