// src/components/game/spectator-view.tsx
import { PanelSection } from '@/components/ui/panel-section'
import { LEDIndicator } from '@/components/ui/led-indicator'

interface Props {
  players: Array<{ id: string; name: string }>
  onlineIds: string[]
}

export function SpectatorView({ players, onlineIds }: Props) {
  return (
    <PanelSection title="Em disputa" className="w-full max-w-sm">
      <div className="flex flex-col gap-2">
        {players.map((p) => (
          <div key={p.id} className="flex items-center gap-3">
            <LEDIndicator color={onlineIds.includes(p.id) ? 'green' : 'off'} />
            <span className="font-mono text-sm uppercase tracking-wider">{p.name}</span>
          </div>
        ))}
      </div>
      <p className="text-xs font-mono text-zinc-500 mt-3 uppercase">Aguardando resultado...</p>
    </PanelSection>
  )
}
