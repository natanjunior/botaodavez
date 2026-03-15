// src/app/api/games/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/token'

export async function POST(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Generate unique token (retry on collision)
  let token: string = ''
  let attempts = 0
  do {
    token = generateToken()
    const existing = await prisma.game.findUnique({ where: { token } })
    if (!existing) break
    attempts++
  } while (attempts < 10)

  if (attempts >= 10) {
    return NextResponse.json({ error: 'Não foi possível gerar token único. Tente novamente.' }, { status: 500 })
  }

  const game = await prisma.game.create({
    data: { token, adminId: user.id },
  })

  return NextResponse.json({ game })
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const games = await prisma.game.findMany({
    where: { adminId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ games })
}
