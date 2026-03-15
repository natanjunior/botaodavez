// src/app/admin/dashboard/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PanelSection } from '@/components/ui/panel-section'
import { AnalogButton } from '@/components/ui/analog-button'
import { GameTokenDisplay } from '@/components/ui/game-token-display'

type Game = { id: string; token: string; createdAt: string }

export default function DashboardPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/games').then((r) => r.json()).then((d) => setGames(d.games ?? []))
  }, [])

  async function createGame() {
    setLoading(true)
    const res = await fetch('/api/games', { method: 'POST' })
    const { game } = await res.json()
    router.push(`/admin/game/${game.id}`)
  }

  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto">
      <PanelSection title="Meus Games" className="mb-4">
        <AnalogButton variant="primary" onClick={createGame} disabled={loading}>
          {loading ? 'Criando...' : '+ Novo Game'}
        </AnalogButton>
      </PanelSection>

      <div className="flex flex-col gap-3">
        {games.map((game) => (
          <PanelSection key={game.id}>
            <div className="flex items-center justify-between">
              <GameTokenDisplay token={game.token} />
              <AnalogButton
                size="sm"
                onClick={() => router.push(`/admin/game/${game.id}`)}
              >
                Abrir
              </AnalogButton>
            </div>
          </PanelSection>
        ))}
      </div>
    </main>
  )
}
