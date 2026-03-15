'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { PanelSection } from '@/components/ui/panel-section'
import { AnalogButton } from '@/components/ui/analog-button'
import { useParticipant } from '@/hooks/use-participant'

const DICEBEAR_STYLES = ['adventurer', 'avataaars', 'bottts', 'fun-emoji', 'lorelei', 'micah']

export default function PlayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [name, setName] = useState('')
  const [avatarSeed, setAvatarSeed] = useState(() => Math.random().toString(36).slice(2))
  const [avatarStyle, setAvatarStyle] = useState('bottts')
  const [gameId, setGameId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { get, save } = useParticipant()
  const router = useRouter()

  useEffect(() => {
    // Fetch game + check for existing participant
    fetch(`/api/games/${token}`).then(async (r) => {
      if (!r.ok) { router.push('/'); return }
      const { game } = await r.json()
      setGameId(game.id)

      const stored = get(token)
      if (stored) {
        // Participant already joined this game — go to game screen
        router.push(`/game/${token}`)
      }
    })
  }, [token, get, router])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!gameId || !name.trim()) return
    setLoading(true)

    const res = await fetch(`/api/games/${gameId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), avatarSeed }),
    })

    if (res.ok) {
      const { participant } = await res.json()
      save({ participantId: participant.id, avatarSeed, gameToken: token })
      router.push(`/game/${token}`)
    } else {
      setLoading(false)
    }
  }

  const avatarUrl = `https://api.dicebear.com/9.x/${avatarStyle}/svg?seed=${avatarSeed}`

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-6">
      <PanelSection title={`Game ${token}`} className="w-full max-w-sm">
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          {/* Avatar preview */}
          <div className="flex flex-col items-center gap-3">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-24 h-24 rounded-full border-4 border-zinc-600 bg-zinc-800"
            />
            <div className="flex gap-2 flex-wrap justify-center">
              {DICEBEAR_STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setAvatarStyle(style)}
                  className={`px-2 py-1 text-xs font-mono uppercase rounded border ${
                    avatarStyle === style
                      ? 'border-orange-500 text-orange-500'
                      : 'border-zinc-600 text-zinc-400'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setAvatarSeed(Math.random().toString(36).slice(2))}
              className="text-xs font-mono text-zinc-500 hover:text-orange-500 uppercase tracking-widest"
            >
              ↻ Outro avatar
            </button>
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="SEU NOME"
            maxLength={20}
            className="bg-zinc-900 text-green-400 font-mono text-sm text-center tracking-widest px-3 py-2 rounded border border-zinc-700 outline-none focus:border-orange-500 uppercase"
          />

          <AnalogButton
            type="submit"
            variant="primary"
            disabled={loading || !name.trim()}
          >
            {loading ? 'Entrando...' : 'Entrar no Game'}
          </AnalogButton>
        </form>
      </PanelSection>
    </main>
  )
}
