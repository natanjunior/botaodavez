// src/app/admin/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PanelSection } from '@/components/ui/panel-section'
import { AnalogButton } from '@/components/ui/analog-button'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (res.ok) {
      router.push('/admin/dashboard')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Erro ao fazer login')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <PanelSection title="Admin Login" className="w-full max-w-sm">
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="EMAIL"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-zinc-900 text-green-400 font-mono text-sm px-3 py-2 rounded border border-zinc-700 outline-none focus:border-orange-500 uppercase placeholder:text-zinc-600"
          />
          <input
            type="password"
            placeholder="SENHA"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-zinc-900 text-green-400 font-mono text-sm px-3 py-2 rounded border border-zinc-700 outline-none focus:border-orange-500"
          />
          {error && <p className="text-red-500 text-xs font-mono">{error}</p>}
          <AnalogButton type="submit" variant="primary" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </AnalogButton>
        </form>
      </PanelSection>
    </main>
  )
}
