import { describe, it, expect } from 'vitest'
import { canStartRound, validateRoundTransition } from '../round'

describe('canStartRound', () => {
  it('fails with fewer than 2 participants', () => {
    expect(canStartRound(['a'], ['a']).canStart).toBe(false)
  })

  it('fails if any selected participant is offline', () => {
    expect(canStartRound(['a', 'b'], ['a']).canStart).toBe(false)
  })

  it('succeeds when all selected are online', () => {
    expect(canStartRound(['a', 'b'], ['a', 'b', 'c']).canStart).toBe(true)
  })
})

describe('validateRoundTransition', () => {
  it('allows waiting → active', () => {
    expect(validateRoundTransition('waiting', 'active').valid).toBe(true)
  })

  it('allows active → finished', () => {
    expect(validateRoundTransition('active', 'finished').valid).toBe(true)
  })

  it('allows active → stopped', () => {
    expect(validateRoundTransition('active', 'stopped').valid).toBe(true)
  })

  it('allows finished → active (play again)', () => {
    expect(validateRoundTransition('finished', 'active').valid).toBe(true)
  })

  it('disallows active → active (already started)', () => {
    expect(validateRoundTransition('active', 'active').valid).toBe(false)
  })

  it('disallows stopped → active (cannot replay stopped round)', () => {
    expect(validateRoundTransition('stopped', 'active').valid).toBe(false)
  })
})
