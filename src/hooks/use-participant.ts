'use client'
import { useCallback } from 'react'
import type { StoredParticipant } from '@/types'

const KEY = 'botao-da-vez-participant'

export function useParticipant() {
  const get = useCallback((gameToken: string): StoredParticipant | null => {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const stored: StoredParticipant = JSON.parse(raw)
    if (stored.gameToken !== gameToken) return null
    return stored
  }, [])

  const save = useCallback((data: StoredParticipant) => {
    localStorage.setItem(KEY, JSON.stringify(data))
  }, [])

  const clear = useCallback(() => {
    localStorage.removeItem(KEY)
  }, [])

  return { get, save, clear }
}
