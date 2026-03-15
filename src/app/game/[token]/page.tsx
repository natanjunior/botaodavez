// src/app/game/[token]/page.tsx
'use client'
import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { GameButton } from '@/components/game/game-button'
import { RoundResult } from '@/components/game/round-result'
import { SpectatorView } from '@/components/game/spectator-view'
import { PanelSection } from '@/components/ui/panel-section'
import { useParticipant } from '@/hooks/use-participant'
import { usePresence } from '@/hooks/use-presence'
import { useGameChannel } from '@/hooks/use-game-channel'
import { calculateRemainingYellow } from '@/lib/timing'
import type {
  ButtonState,
  BroadcastRoundCreated,
  BroadcastRoundStart,
  BroadcastRoundResult,
  PresenceParticipant,
} from '@/types'

export default function GamePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const { get } = useParticipant()
  const router = useRouter()

  const [participantId, setParticipantId] = useState<string | null>(null)
  const [buttonState, setButtonState] = useState<ButtonState>('disabled')
  const [roundPlayId, setRoundPlayId] = useState<string | null>(null)
  const [reactionStartTime, setReactionStartTime] = useState<number | null>(null)
  const [reactionTimeMs, setReactionTimeMs] = useState<number | null>(null)
  const [roundResult, setRoundResult] = useState<BroadcastRoundResult | null>(null)
  const [isInRound, setIsInRound] = useState(false)
  const [roundPlayers, setRoundPlayers] = useState<Array<{ id: string; name: string }>>([])

  // Resolve participant identity
  useEffect(() => {
    const stored = get(token)
    if (!stored) { router.push(`/play/${token}`); return }
    setParticipantId(stored.participantId)
  }, [token, get, router])

  const self: PresenceParticipant | null = participantId
    ? { participantId, name: '' }
    : null

  const { onlineIds } = usePresence(token, self)

  // Restore state on mount / reconnect
  useEffect(() => {
    if (!participantId) return
    fetch(`/api/games/${token}`).then(async (r) => {
      if (!r.ok) return
      const { game } = await r.json()
      const activeRound = game.rounds?.[0]
      if (!activeRound || activeRound.status === 'waiting') return

      const inRound = activeRound.roundParticipants?.some(
        (rp: { participantId: string }) => rp.participantId === participantId
      )
      setIsInRound(!!inRound)
      setRoundPlayers(activeRound.roundParticipants?.map((rp: { participantId: string; participant?: { name: string } }) => ({
        id: rp.participantId,
        name: rp.participant?.name ?? '',
      })) ?? [])

      if (activeRound.status === 'active' && activeRound.roundPlays?.[0]) {
        const play = activeRound.roundPlays[0]
        setRoundPlayId(play.id)
        const yellowEndsAt = new Date(play.yellowEndsAt)
        const remaining = Math.max(0, yellowEndsAt.getTime() - Date.now())
        if (remaining > 0) {
          if (inRound) setButtonState('yellow')
          setTimeout(() => {
            if (inRound) { setButtonState('green'); setReactionStartTime(Date.now()) }
          }, remaining)
        } else {
          if (inRound) { setButtonState('green'); setReactionStartTime(Date.now()) }
        }
      }
    })
  }, [participantId, token])

  // Handle round_created broadcast
  useGameChannel(token, 'round_created', useCallback((payload: BroadcastRoundCreated) => {
    const players = payload.participants
    setRoundPlayers(players)
    const inRound = players.some((p) => p.id === participantId)
    setIsInRound(inRound)
    if (inRound) setButtonState('disabled')
    setRoundResult(null)
    setReactionTimeMs(null)
  }, [participantId]))

  // Handle round_start broadcast
  useGameChannel(token, 'round_start', useCallback((payload: BroadcastRoundStart) => {
    if (!isInRound) return
    setRoundPlayId(payload.roundPlayId)
    setButtonState('yellow')
    const yellowEndsAt = new Date(payload.yellowEndsAt)
    const remaining = calculateRemainingYellow(yellowEndsAt)
    setTimeout(() => {
      setButtonState('green')
      setReactionStartTime(Date.now())
    }, remaining)
  }, [isInRound]))

  // Handle round_result broadcast
  useGameChannel(token, 'round_result', useCallback((payload: BroadcastRoundResult) => {
    setRoundResult(payload)
    if (participantId) {
      const isWinner = payload.winners.includes(participantId)
      const myResult = payload.results.find((r) => r.participantId === participantId)
      if (myResult?.eliminated) setButtonState('red')
      else if (isWinner) setButtonState('winner')
      else setButtonState('loser')
    }
  }, [participantId]))

  // Handle round_stopped
  useGameChannel(token, 'round_stopped', () => {
    setButtonState('disabled')
    setIsInRound(false)
  })

  async function handleButtonPress() {
    if (!roundPlayId || !participantId) return

    if (buttonState === 'yellow') {
      setButtonState('red')
      await fetch(`/api/plays/${roundPlayId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, eliminated: true }),
      })
    } else if (buttonState === 'green' && reactionStartTime) {
      const ms = Date.now() - reactionStartTime
      setReactionTimeMs(ms)
      setButtonState('loser') // optimistic — server will correct via round_result broadcast
      await fetch(`/api/plays/${roundPlayId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, reactionTimeMs: ms }),
      })
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 gap-6">
      {isInRound ? (
        <>
          <GameButton
            state={buttonState}
            reactionTimeMs={reactionTimeMs}
            onClick={handleButtonPress}
          />
          {roundResult && <RoundResult result={roundResult} />}
        </>
      ) : (
        <>
          <PanelSection title="Você é espectador" className="w-full max-w-sm">
            <p className="font-mono text-xs text-zinc-500 uppercase">
              Aguardando o admin iniciar uma rodada...
            </p>
          </PanelSection>
          {roundPlayers.length > 0 && (
            <SpectatorView players={roundPlayers} onlineIds={onlineIds} />
          )}
          {roundResult && <RoundResult result={roundResult} />}
        </>
      )}
    </main>
  )
}
