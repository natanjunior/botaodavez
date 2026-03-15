import { describe, it, expect } from 'vitest'
import { calculateRoundResult } from '../game-logic'

const p = (id: string, ms: number | null, eliminated = false) => ({
  participantId: id,
  reactionTimeMs: ms,
  eliminated,
})

describe('calculateRoundResult', () => {
  it('returns winner with lowest reaction time', () => {
    const result = calculateRoundResult([p('a', 300), p('b', 200), p('c', 400)])
    expect(result.type).toBe('winner')
    expect(result.winners).toEqual(['b'])
  })

  it('returns tie when two participants have equal time', () => {
    const result = calculateRoundResult([p('a', 250), p('b', 250)])
    expect(result.type).toBe('tie')
    expect(result.winners).toContain('a')
    expect(result.winners).toContain('b')
  })

  it('returns no_winner when all eliminated', () => {
    const result = calculateRoundResult([
      p('a', null, true),
      p('b', null, true),
    ])
    expect(result.type).toBe('no_winner')
    expect(result.winners).toHaveLength(0)
  })

  it('ignores eliminated participants when determining winner', () => {
    const result = calculateRoundResult([p('a', null, true), p('b', 300)])
    expect(result.type).toBe('winner')
    expect(result.winners).toEqual(['b'])
  })

  it('returns no_winner when all results are null (timeout)', () => {
    const result = calculateRoundResult([p('a', null), p('b', null)])
    expect(result.type).toBe('no_winner')
  })

  it('assigns rank 1 to winner and rank 2 to second place', () => {
    const result = calculateRoundResult([p('a', 400), p('b', 200)])
    const a = result.results.find((r) => r.participantId === 'a')!
    const b = result.results.find((r) => r.participantId === 'b')!
    expect(b.rank).toBe(1)
    expect(a.rank).toBe(2)
  })

  it('assigns null rank to eliminated participants', () => {
    const result = calculateRoundResult([p('a', null, true), p('b', 200)])
    const a = result.results.find((r) => r.participantId === 'a')!
    expect(a.rank).toBeNull()
  })
})
