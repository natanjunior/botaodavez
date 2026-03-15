'use client'
import { useEffect, useState, use } from 'react'
import { PanelSection } from '@/components/ui/panel-section'
import { AnalogButton } from '@/components/ui/analog-button'
import { GameTokenDisplay } from '@/components/ui/game-token-display'
import { ParticipantList } from '@/components/admin/participant-list'
import { usePresence } from '@/hooks/use-presence'

type Participant = { id: string; name: string; avatarSeed: string }
type Game = { id: string; token: string; participants: Participant[] }

export default function AdminGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [game, setGame] = useState<Game | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const { onlineIds } = usePresence(game?.token ?? '', null)

  useEffect(() => {
    fetch(`/api/admin/games/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.game) setGame(d.game)
      })
  }, [id])

  function toggleSelect(participantId: string) {
    setSelectedIds((prev) =>
      prev.includes(participantId)
        ? prev.filter((pid) => pid !== participantId)
        : [...prev, participantId]
    )
  }

  if (!game) return <div className="p-4 font-mono text-sm">Carregando...</div>

  const canStart = selectedIds.length >= 2 && selectedIds.every((pid) => onlineIds.includes(pid))

  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto flex flex-col gap-4">
      <PanelSection>
        <GameTokenDisplay token={game.token} />
      </PanelSection>

      <PanelSection title="Participantes">
        <ParticipantList
          participants={game.participants}
          onlineIds={onlineIds}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      </PanelSection>

      <PanelSection title="Rodada">
        <AnalogButton
          variant="primary"
          disabled={!canStart}
          className="w-full"
        >
          {canStart ? 'Jogar' : 'Selecione 2+ participantes online'}
        </AnalogButton>
      </PanelSection>
    </main>
  )
}
