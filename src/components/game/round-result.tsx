// src/components/game/round-result.tsx
import type { BroadcastRoundResult } from '@/types'
import { SegmentDisplay } from '@/components/ui/segment-display'
import { PanelSection } from '@/components/ui/panel-section'

interface Props {
  result: BroadcastRoundResult
}

export function RoundResult({ result }: Props) {
  return (
    <PanelSection title="Resultado" className="w-full max-w-sm">
      <div className="flex flex-col gap-3">
        <div className="text-center">
          {result.type === 'winner' && (
            <p className="font-mono text-lg text-orange-500 uppercase tracking-widest">
              🏆 {result.results.find((r) => r.rank === 1)?.name}
            </p>
          )}
          {result.type === 'tie' && (
            <p className="font-mono text-lg text-yellow-400 uppercase tracking-widest">Empate!</p>
          )}
          {result.type === 'no_winner' && (
            <p className="font-mono text-lg text-zinc-400 uppercase tracking-widest">Sem vencedor</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {result.results
            .filter((r) => !r.eliminated && r.reactionTimeMs != null)
            .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
            .map((r) => (
              <div key={r.participantId} className="flex items-center justify-between">
                <span className="font-mono text-sm uppercase">{r.name}</span>
                <SegmentDisplay value={`${r.reactionTimeMs}ms`} />
              </div>
            ))}
        </div>
      </div>
    </PanelSection>
  )
}
