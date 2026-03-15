import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Self-contained Prisma factory
vi.mock('@/lib/prisma', () => ({
  prisma: {
    round: { findUnique: vi.fn(), update: vi.fn() },
  },
}))

// Self-contained Supabase factory
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { PATCH } from '../rounds/[id]/stop/route'

const ROUND_ID = 'round-1'
const params = Promise.resolve({ id: ROUND_ID })

function makeRequest() {
  return new NextRequest('http://localhost/api/rounds/round-1/stop', { method: 'PATCH' })
}

const mockRound = {
  id: ROUND_ID,
  status: 'active',
  game: { id: 'game-1', adminId: 'admin-1', token: 'ABC123' },
}

let sendMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  sendMock = vi.fn().mockResolvedValue({ status: 'ok' })
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }),
    },
  } as never)
  vi.mocked(createServiceClient).mockResolvedValue({
    channel: vi.fn(() => ({ send: sendMock })),
  } as never)
  vi.mocked(prisma.round.findUnique).mockResolvedValue(mockRound as never)
  vi.mocked(prisma.round.update).mockResolvedValue({} as never)
})

describe('PATCH /api/rounds/[id]/stop', () => {
  it('returns 200 with ok:true and updates round status to stopped', async () => {
    const res = await PATCH(makeRequest(), { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(prisma.round.update).toHaveBeenCalledWith({
      where: { id: ROUND_ID },
      data: { status: 'stopped' },
    })
  })

  it('broadcasts round_stopped with correct payload', async () => {
    await PATCH(makeRequest(), { params })

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'round_stopped',
        payload: { roundId: ROUND_ID },
      })
    )
  })

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)

    const res = await PATCH(makeRequest(), { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when round does not exist', async () => {
    vi.mocked(prisma.round.findUnique).mockResolvedValue(null)

    const res = await PATCH(makeRequest(), { params })
    expect(res.status).toBe(404)
  })

  it('returns 403 when admin does not own the game', async () => {
    vi.mocked(prisma.round.findUnique).mockResolvedValue({
      ...mockRound,
      game: { ...mockRound.game, adminId: 'other-admin' },
    } as never)

    const res = await PATCH(makeRequest(), { params })
    expect(res.status).toBe(403)
  })
})
