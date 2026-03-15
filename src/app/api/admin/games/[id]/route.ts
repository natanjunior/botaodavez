import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const game = await prisma.game.findFirst({
    where: { id, adminId: user.id },
    include: {
      participants: true,
      teams: true,
      rounds: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!game) return NextResponse.json({ error: 'Game não encontrado' }, { status: 404 })
  return NextResponse.json({ game })
}
