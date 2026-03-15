// src/app/admin/game/[id]/page.tsx
'use client'
import { useEffect, useState, useCallback, use } from 'react'
import { PanelSection } from '@/components/ui/panel-section'
import { AnalogButton } from '@/components/ui/analog-button'
import { GameTokenDisplay } from '@/components/ui/game-token-display'
import { ParticipantList } from '@/components/admin/participant-list'
import { RoundResult } from '@/components/game/round-result'
import { usePresence } from '@/hooks/use-presence'
import { useGameChannel } from '@/hooks/use-game-channel'
import type { BroadcastRoundResult } from '@/types'

type Participant = { id: string; name: string; avatarSeed: string }
type Game = { id: string; token: string; participants: Participant[] }

type RoundStatus = 'waiting' | 'active' | 'finished' | 'stopped'

export default function AdminGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [game, setGame] = useState<Game | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null)
  const [roundStatus, setRoundStatus] = useState<RoundStatus | null>(null)
  const [roundResult, setRoundResult] = useState<BroadcastRoundResult | null>(null)
  const [loading, setLoading] = useState(false)

  const { onlineIds } = usePresence(game?.token ?? '', null)

  useEffect(() => {
    fetch(`/api/admin/games/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.game) setGame(d.game)
      })
  }, [id])

  // Refetch participant list when presence changes — catches participants who joined after initial load
  const onlineKey = onlineIds.join(',')
  useEffect(() => {
    if (!onlineKey) return
    fetch(`/api/admin/games/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.game) setGame(d.game)
      })
  }, [id, onlineKey])

  // Handle round_result broadcast
  useGameChannel(game?.token ?? '', 'round_result', useCallback((payload: BroadcastRoundResult) => {
    setRoundResult(payload)
    setRoundStatus('finished')
  }, []))

  function toggleSelect(participantId: string) {
    setSelectedIds((prev) =>
      prev.includes(participantId)
        ? prev.filter((pid) => pid !== participantId)
        : [...prev, participantId]
    )
  }

  // "Jogar" — creates a new Round (for first time or after "Trocar Participantes")
  async function handleCreateRound() {
    if (!game) return
    setLoading(true)
    const res = await fetch(`/api/games/${game.id}/rounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantIds: selectedIds }),
    })
    const { round } = await res.json()
    setCurrentRoundId(round.id)
    setRoundStatus('waiting')
    setRoundResult(null)
    setLoading(false)
  }

  // "Iniciar Jogada" — starts a RoundPlay on the current Round
  async function handleStartPlay() {
    if (!currentRoundId) return
    setLoading(true)
    await fetch(`/api/rounds/${currentRoundId}/plays`, { method: 'POST' })
    setRoundStatus('active')
    setLoading(false)
  }

  // "Parar Rodada" — stops the current Round
  async function handleStop() {
    if (!currentRoundId) return
    setLoading(true)
    await fetch(`/api/rounds/${currentRoundId}/stop`, { method: 'PATCH' })
    setRoundStatus('stopped')
    setCurrentRoundId(null)
    setLoading(false)
  }

  // "Jogar Outra Vez" — reuses current Round (same participants), starts new RoundPlay
  async function handlePlayAgain() {
    if (!currentRoundId) return
    setLoading(true)
    setRoundResult(null)
    await fetch(`/api/rounds/${currentRoundId}/plays`, { method: 'POST' })
    setRoundStatus('active')
    setLoading(false)
  }

  // "Trocar Participantes" — clears round state, lets admin re-select participants
  function handleChangeParticipants() {
    setCurrentRoundId(null)
    setRoundStatus(null)
    setRoundResult(null)
  }

  if (!game) return <div className="p-4 font-mono text-sm">Carregando...</div>

  const canStart = selectedIds.length >= 2 && selectedIds.every((pid) => onlineIds.includes(pid))

  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto flex flex-col gap-4">
      <PanelSection>
        <GameTokenDisplay token={game.token} />
      </PanelSection>

      {/* Show participant list when no round is active */}
      {(!currentRoundId || roundStatus === null || roundStatus === 'stopped') && (
        <PanelSection title="Participantes">
          <ParticipantList
            participants={game.participants}
            onlineIds={onlineIds}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        </PanelSection>
      )}

      <PanelSection title="Rodada">
        {/* No round yet — show "Jogar" */}
        {!currentRoundId && (
          <AnalogButton
            variant="primary"
            disabled={!canStart || loading}
            onClick={handleCreateRound}
            className="w-full"
          >
            {canStart ? 'Jogar' : 'Selecione 2+ participantes online'}
          </AnalogButton>
        )}

        {/* Round waiting — show "Iniciar Jogada" */}
        {currentRoundId && roundStatus === 'waiting' && (
          <AnalogButton variant="primary" disabled={loading} onClick={handleStartPlay} className="w-full">
            Iniciar Jogada
          </AnalogButton>
        )}

        {/* Round active — show "Parar Rodada" */}
        {currentRoundId && roundStatus === 'active' && (
          <AnalogButton variant="danger" disabled={loading} onClick={handleStop} className="w-full">
            Parar Rodada
          </AnalogButton>
        )}

        {/* Round finished — show result + "Jogar Outra Vez" / "Trocar Participantes" */}
        {roundStatus === 'finished' && (
          <div className="flex flex-col gap-3">
            {roundResult && <RoundResult result={roundResult} />}
            <div className="flex gap-3">
              <AnalogButton variant="primary" disabled={loading} onClick={handlePlayAgain} className="flex-1">
                Jogar Outra Vez
              </AnalogButton>
              <AnalogButton variant="secondary" disabled={loading} onClick={handleChangeParticipants} className="flex-1">
                Trocar Participantes
              </AnalogButton>
            </div>
          </div>
        )}
      </PanelSection>
    </main>
  )
}
