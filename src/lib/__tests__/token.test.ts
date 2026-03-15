import { describe, it, expect } from 'vitest'
import { generateToken } from '../token'

describe('generateToken', () => {
  it('generates a 6-character string', () => {
    expect(generateToken()).toHaveLength(6)
  })

  it('uses only alphanumeric uppercase characters', () => {
    const token = generateToken()
    expect(token).toMatch(/^[A-Z0-9]{6}$/)
  })

  it('generates different tokens on successive calls', () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateToken()))
    expect(tokens.size).toBeGreaterThan(1)
  })
})
