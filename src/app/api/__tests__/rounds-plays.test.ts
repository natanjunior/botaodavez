import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock next/server — preserve NextRequest/NextResponse, replace after with no-op
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return { ...actual, after: vi.fn() }
})

// Mock timing to control yellowDurationMs and yellowEndsAt values precisely
vi.mock('@/lib/timing', () => ({
  generateYellowDuration: vi.fn().mockReturnValue(2500),
  calculateYellowEndsAt: vi.fn().mockReturnValue(new Date('2026-03-15T12:00:00.000Z')),
}))

// Mock finalizeRound to isolate the handler (called inside the after() callback)
vi.mock('@/lib/finalize-round', () => ({
  finalizeRound: vi.fn().mockResolvedValue(undefined),
}))

// Self-contained Prisma factory
vi.mock('@/lib/prisma', () => ({
  prisma: {
    roundPlay: { create: vi.fn() },
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
import { POST } from '../rounds/[id]/plays/route'

function makeRequest() {
  return new NextRequest('http://localhost/api/rounds/round-1/plays', { method: 'POST' })
}

const ROUND_ID = 'round-1'
const params = Promise.resolve({ id: ROUND_ID })

const mockRound = {
  id: ROUND_ID,
  status: 'waiting',
  game: { id: 'game-1', adminId: 'admin-1', token: 'ABC123' },
  roundParticipants: [{ participantId: 'p1' }, { participantId: 'p2' }],
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
  // roundPlay.create returns the value that the handler spreads into the response.
  // yellowDurationMs must match what generateYellowDuration() mock returns (2500).
  // yellowEndsAt is overridden in the response by the live calculateYellowEndsAt() mock.
  vi.mocked(prisma.roundPlay.create).mockResolvedValue({
    id: 'play-1',
    roundId: ROUND_ID,
    yellowDurationMs: 2500,
    yellowEndsAt: new Date('2026-03-15T12:00:00.000Z'),
  } as never)
  vi.mocked(prisma.round.update).mockResolvedValue({} as never)
})

describe('POST /api/rounds/[id]/plays', () => {
  it('returns 200 with roundPlay containing yellowDurationMs from generateYellowDuration', async () => {
    const res = await POST(makeRequest(), { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.roundPlay).toBeDefined()
    // generateYellowDuration is mocked to return 2500; roundPlay.create returns this value
    expect(body.roundPlay.yellowDurationMs).toBe(2500)
  })

  it('returns 200 with yellowEndsAt as ISO string from calculateYellowEndsAt', async () => {
    const res = await POST(makeRequest(), { params })
    const body = await res.json()

    // calculateYellowEndsAt mock returns new Date('2026-03-15T12:00:00.000Z')
    // The handler overrides yellowEndsAt with yellowEndsAt.toISOString()
    expect(body.roundPlay.yellowEndsAt).toBe('2026-03-15T12:00:00.000Z')
  })

  it('broadcasts round_start with correct payload', async () => {
    await POST(makeRequest(), { params })

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'round_start',
        payload: expect.objectContaining({
          roundPlayId: 'play-1',
          yellowDurationMs: 2500,
          yellowEndsAt: '2026-03-15T12:00:00.000Z',
        }),
      })
    )
  })

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)

    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when round does not exist', async () => {
    vi.mocked(prisma.round.findUnique).mockResolvedValue(null)

    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(404)
  })

  it('returns 403 when admin does not own the game', async () => {
    vi.mocked(prisma.round.findUnique).mockResolvedValue({
      ...mockRound,
      game: { ...mockRound.game, adminId: 'other-admin' },
    } as never)

    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(403)
  })

  it('returns 409 when round is already active', async () => {
    vi.mocked(prisma.round.findUnique).mockResolvedValue({
      ...mockRound,
      status: 'active',
    } as never)

    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(409)
  })

  it('returns 409 when round is stopped', async () => {
    vi.mocked(prisma.round.findUnique).mockResolvedValue({
      ...mockRound,
      status: 'stopped',
    } as never)

    const res = await POST(makeRequest(), { params })
    expect(res.status).toBe(409)
  })
})
