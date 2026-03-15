// src/app/api/games/[id]/participants/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params
  const { name, avatarSeed } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }

  const game = await prisma.game.findUnique({ where: { id: gameId } })
  if (!game) {
    return NextResponse.json({ error: 'Game não encontrado' }, { status: 404 })
  }

  const participant = await prisma.participant.create({
    data: {
      gameId,
      name: name.trim(),
      avatarSeed: avatarSeed ?? name.trim(),
    },
  })

  return NextResponse.json({ participant })
}
