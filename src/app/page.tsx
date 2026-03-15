// src/app/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PanelSection } from '@/components/ui/panel-section'
import { AnalogButton } from '@/components/ui/analog-button'

export default function HomePage() {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)
    setError('')

    const res = await fetch(`/api/games/${token.toUpperCase()}`)
    if (res.ok) {
      router.push(`/play/${token.toUpperCase()}`)
    } else {
      setError('Código inválido. Verifique e tente novamente.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center">
        <h1 className="font-mono text-3xl font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
          Botão da Vez
        </h1>
        <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest mt-1">
          Quem aperta primeiro, fica com a vez
        </p>
      </div>

      <PanelSection title="Entrar no Game" className="w-full max-w-xs">
        <form onSubmit={handleJoin} className="flex flex-col gap-3">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value.toUpperCase())}
            placeholder="CÓDIGO"
            maxLength={6}
            className="bg-zinc-900 text-green-400 font-mono text-2xl text-center tracking-[0.4em] px-3 py-3 rounded border border-zinc-700 outline-none focus:border-orange-500 uppercase"
          />
          {error && <p className="text-red-500 text-xs font-mono text-center">{error}</p>}
          <AnalogButton type="submit" variant="primary" disabled={loading || token.length < 6}>
            {loading ? 'Verificando...' : 'Entrar'}
          </AnalogButton>
        </form>
      </PanelSection>

      <a href="/admin" className="text-xs font-mono text-zinc-500 uppercase tracking-widest hover:text-orange-500">
        Admin →
      </a>
    </main>
  )
}
