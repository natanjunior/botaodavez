// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }

  // Ensure Administrator record exists (id = Supabase Auth user.id)
  const { prisma } = await import('@/lib/prisma')
  await prisma.administrator.upsert({
    where: { id: data.user.id },
    update: {},
    create: {
      id: data.user.id,
      email: data.user.email!,
      passwordHash: '', // managed by Supabase Auth
    },
  })

  return NextResponse.json({ user: { id: data.user.id, email: data.user.email } })
}
