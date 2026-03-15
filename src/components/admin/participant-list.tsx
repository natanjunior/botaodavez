'use client'
import { LEDIndicator } from '@/components/ui/led-indicator'

type Participant = {
  id: string
  name: string
  avatarSeed: string
}

interface Props {
  participants: Participant[]
  onlineIds: string[]
  selectedIds: string[]
  onToggleSelect: (id: string) => void
}

export function ParticipantList({ participants, onlineIds, selectedIds, onToggleSelect }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {participants.length === 0 && (
        <p className="text-xs font-mono text-zinc-500 uppercase">Nenhum participante ainda</p>
      )}
      {participants.map((p) => {
        const isOnline = onlineIds.includes(p.id)
        const isSelected = selectedIds.includes(p.id)
        return (
          <button
            key={p.id}
            onClick={() => onToggleSelect(p.id)}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              isSelected
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-zinc-600 hover:border-zinc-400'
            }`}
          >
            <LEDIndicator color={isOnline ? 'green' : 'off'} />
            <img
              src={`https://api.dicebear.com/9.x/bottts/svg?seed=${p.avatarSeed}`}
              alt={p.name}
              className="w-8 h-8 rounded-full bg-zinc-800"
            />
            <span className="font-mono text-sm uppercase tracking-wider flex-1 text-left">
              {p.name}
            </span>
            {isSelected && (
              <span className="text-orange-500 text-xs font-mono">✓</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
