// src/lib/round.ts
type RoundStatus = 'waiting' | 'active' | 'finished' | 'stopped'

export type StartRoundCheck = { canStart: boolean; reason?: string }
export type TransitionCheck = { valid: boolean; reason?: string }

const VALID_TRANSITIONS: Record<RoundStatus, RoundStatus[]> = {
  waiting: ['active'],
  active: ['finished', 'stopped'],
  finished: ['active'], // play again (new RoundPlay)
  stopped: [],
}

export function canStartRound(selectedIds: string[], onlineIds: string[]): StartRoundCheck {
  if (selectedIds.length < 2) {
    return { canStart: false, reason: 'Mínimo de 2 participantes' }
  }
  const allOnline = selectedIds.every((id) => onlineIds.includes(id))
  if (!allOnline) {
    return { canStart: false, reason: 'Nem todos os participantes estão online' }
  }
  return { canStart: true }
}

export function validateRoundTransition(from: RoundStatus, to: RoundStatus): TransitionCheck {
  const allowed = VALID_TRANSITIONS[from] ?? []
  if (!allowed.includes(to)) {
    return { valid: false, reason: `Transição inválida: ${from} → ${to}` }
  }
  return { valid: true }
}
