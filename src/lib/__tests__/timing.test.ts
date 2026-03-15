import { describe, it, expect } from 'vitest'
import { generateYellowDuration, calculateYellowEndsAt, calculateRemainingYellow } from '../timing'

describe('generateYellowDuration', () => {
  it('returns value between 1500 and 3500', () => {
    for (let i = 0; i < 100; i++) {
      const d = generateYellowDuration()
      expect(d).toBeGreaterThanOrEqual(1500)
      expect(d).toBeLessThanOrEqual(3500)
    }
  })
})

describe('calculateYellowEndsAt', () => {
  it('returns a date yellowDurationMs in the future', () => {
    const before = Date.now()
    const endsAt = calculateYellowEndsAt(2000)
    const after = Date.now()
    expect(endsAt.getTime()).toBeGreaterThanOrEqual(before + 2000)
    expect(endsAt.getTime()).toBeLessThanOrEqual(after + 2000)
  })
})

describe('calculateRemainingYellow', () => {
  it('returns remaining ms until yellowEndsAt', () => {
    const endsAt = new Date(Date.now() + 1500)
    const remaining = calculateRemainingYellow(endsAt)
    expect(remaining).toBeGreaterThan(1400)
    expect(remaining).toBeLessThanOrEqual(1500)
  })

  it('returns 0 if yellowEndsAt is in the past', () => {
    const endsAt = new Date(Date.now() - 1000)
    expect(calculateRemainingYellow(endsAt)).toBe(0)
  })

  it('returns 0 when yellowEndsAt is exactly now (boundary)', () => {
    const endsAt = new Date(Date.now())
    const remaining = calculateRemainingYellow(endsAt)
    expect(remaining).toBeGreaterThanOrEqual(0)
    expect(remaining).toBeLessThanOrEqual(1) // at most 1ms drift
  })
})
