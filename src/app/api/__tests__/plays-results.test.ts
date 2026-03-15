import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Self-contained Prisma factory
vi.mock('@/lib/prisma', () => ({
  prisma: {
    roundPlay: { findUnique: vi.fn() },
    roundPlayResult: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

// Mock finalizeRound to isolate the route handler
vi.mock('@/lib/finalize-round', () => ({
  finalizeRound: vi.fn().mockResolvedValue(undefined),
}))

import { prisma } from '@/lib/prisma'
import { finalizeRound } from '@/lib/finalize-round'
import { POST } from '../plays/[id]/results/route'

const ROUND_PLAY_ID = 'play-1'
const params = Promise.resolve({ id: ROUND_PLAY_ID })

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/plays/play-1/results', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

// Base mock for a roundPlay returned inside the transaction
function makeRoundPlay(overrides: Partial<{
  finishedAt: Date | null
  roundStatus: string
  results: { participantId: string }[]
  participantCount: number
}> = {}) {
  return {
    id: ROUND_PLAY_ID,
    finishedAt: overrides.finishedAt ?? null,
    round: {
      id: 'round-1',
      status: overrides.roundStatus ?? 'active',
      game: { id: 'game-1', token: 'ABC123' },
      roundParticipants: Array.from(
        { length: overrides.participantCount ?? 2 },
        (_, i) => ({ participantId: `p${i + 1}` })
      ),
    },
    results: overrides.results ?? [],
  }
}

// Mock for the second findUnique call (after transaction, for finalization)
function makeRoundPlayForFinalize(results: { participantId: string; reactionTimeMs: number | null; eliminated: boolean }[]) {
  return {
    id: ROUND_PLAY_ID,
    finishedAt: null,
    results,
    round: { id: 'round-1', game: { token: 'ABC123' } },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.$transaction).mockImplementation((fn) => fn(prisma) as never)
  vi.mocked(prisma.roundPlayResult.create).mockResolvedValue({} as never)
})

describe('POST /api/plays/[id]/results', () => {
  it('returns 200 and does not call finalizeRound when not the last result', async () => {
    // 2 participants, 0 results so far — after this submission: 1/2, not last
    vi.mocked(prisma.roundPlay.findUnique).mockResolvedValue(
      makeRoundPlay({ participantCount: 2, results: [] }) as never
    )

    const res = await POST(makeRequest({ participantId: 'p1', reactionTimeMs: 300 }), { params })

    expect(res.status).toBe(200)
    expect(finalizeRound).not.toHaveBeenCalled()
  })

  it('returns 200 and calls finalizeRound when last result arrives', async () => {
    // 2 participants, p1 already submitted — p2 is the last
    vi.mocked(prisma.roundPlay.findUnique)
      .mockResolvedValueOnce(
        makeRoundPlay({
          participantCount: 2,
          results: [{ participantId: 'p1' }],
        }) as never
      )
      .mockResolvedValue(
        makeRoundPlayForFinalize([
          { participantId: 'p1', reactionTimeMs: 300, eliminated: false },
          { participantId: 'p2', reactionTimeMs: 200, eliminated: false },
        ]) as never
      )

    const res = await POST(makeRequest({ participantId: 'p2', reactionTimeMs: 200 }), { params })

    expect(res.status).toBe(200)
    expect(finalizeRound).toHaveBeenCalledWith(
      'round-1',
      'ABC123',
      expect.any(Array),
      ROUND_PLAY_ID
    )
  })

  it('persists eliminated result with null reactionTimeMs', async () => {
    vi.mocked(prisma.roundPlay.findUnique).mockResolvedValue(
      makeRoundPlay({ participantCount: 2, results: [] }) as never
    )

    await POST(makeRequest({ participantId: 'p1', eliminated: true }), { params })

    expect(prisma.roundPlayResult.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reactionTimeMs: null,
          eliminated: true,
        }),
      })
    )
  })

  it('returns 200 without creating duplicate result when participantId already submitted', async () => {
    vi.mocked(prisma.roundPlay.findUnique).mockResolvedValue(
      makeRoundPlay({ results: [{ participantId: 'p1' }] }) as never
    )

    const res = await POST(makeRequest({ participantId: 'p1', reactionTimeMs: 100 }), { params })

    expect(res.status).toBe(200)
    expect(prisma.roundPlayResult.create).not.toHaveBeenCalled()
  })

  it('returns 200 immediately when roundPlay is already finalised (finishedAt set)', async () => {
    vi.mocked(prisma.roundPlay.findUnique).mockResolvedValue(
      makeRoundPlay({ finishedAt: new Date() }) as never
    )

    const res = await POST(makeRequest({ participantId: 'p1', reactionTimeMs: 100 }), { params })

    expect(res.status).toBe(200)
    expect(prisma.roundPlayResult.create).not.toHaveBeenCalled()
  })

  it('returns 200 immediately when round is not active', async () => {
    vi.mocked(prisma.roundPlay.findUnique).mockResolvedValue(
      makeRoundPlay({ roundStatus: 'finished' }) as never
    )
    const res = await POST(makeRequest({ participantId: 'p1', reactionTimeMs: 100 }), { params })
    expect(res.status).toBe(200)
    expect(prisma.roundPlayResult.create).not.toHaveBeenCalled()
  })

  it('returns 404 when roundPlay does not exist', async () => {
    vi.mocked(prisma.roundPlay.findUnique).mockResolvedValue(null)

    const res = await POST(makeRequest({ participantId: 'p1', reactionTimeMs: 100 }), { params })

    expect(res.status).toBe(404)
  })
})
