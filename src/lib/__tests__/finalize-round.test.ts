import { describe, it, expect, vi, beforeEach } from 'vitest'

// Self-contained Prisma factory — must be before imports
vi.mock('@/lib/prisma', () => ({
  prisma: {
    roundPlay: { updateMany: vi.fn() },
    roundPlayResult: { updateMany: vi.fn() },
    round: { update: vi.fn() },
    participant: { findMany: vi.fn() },
  },
}))

// Self-contained Supabase factory
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { createServiceClient } from '@/lib/supabase/server'
import { finalizeRound } from '../finalize-round'

const ROUND_ID = 'round-1'
const GAME_TOKEN = 'ABC123'
const ROUND_PLAY_ID = 'play-1'

const results = [
  { participantId: 'p1', reactionTimeMs: 300, eliminated: false },
  { participantId: 'p2', reactionTimeMs: 200, eliminated: false },
]

let sendMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  sendMock = vi.fn().mockResolvedValue({ status: 'ok' })
  vi.mocked(createServiceClient).mockResolvedValue({
    channel: vi.fn(() => ({ send: sendMock })),
  } as never)
  vi.mocked(prisma.roundPlay.updateMany).mockResolvedValue({ count: 1 } as never)
  vi.mocked(prisma.roundPlayResult.updateMany).mockResolvedValue({ count: 1 } as never)
  vi.mocked(prisma.round.update).mockResolvedValue({} as never)
  vi.mocked(prisma.participant.findMany).mockResolvedValue([
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
  ] as never)
})

describe('finalizeRound', () => {
  it('updates round status to finished and broadcasts round_result', async () => {
    await finalizeRound(ROUND_ID, GAME_TOKEN, results, ROUND_PLAY_ID)

    expect(prisma.round.update).toHaveBeenCalledWith({
      where: { id: ROUND_ID },
      data: { status: 'finished' },
    })
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'round_result' })
    )
  })

  it('returns immediately if already finalised (race condition guard)', async () => {
    vi.mocked(prisma.roundPlay.updateMany).mockResolvedValue({ count: 0 } as never)

    await finalizeRound(ROUND_ID, GAME_TOKEN, results, ROUND_PLAY_ID)

    expect(prisma.round.update).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
    expect(prisma.roundPlayResult.updateMany).not.toHaveBeenCalled()
  })

  it('broadcasts winner when one participant has lowest time', async () => {
    await finalizeRound(ROUND_ID, GAME_TOKEN, results, ROUND_PLAY_ID)

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          type: 'winner',
          winners: ['p2'],
        }),
      })
    )
  })

  it('broadcasts no_winner when all participants are eliminated', async () => {
    const eliminated = [
      { participantId: 'p1', reactionTimeMs: null, eliminated: true },
      { participantId: 'p2', reactionTimeMs: null, eliminated: true },
    ]

    await finalizeRound(ROUND_ID, GAME_TOKEN, eliminated, ROUND_PLAY_ID)

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ type: 'no_winner', winners: [] }),
      })
    )
  })

  it('broadcasts tie when two participants have equal reaction time', async () => {
    const tied = [
      { participantId: 'p1', reactionTimeMs: 250, eliminated: false },
      { participantId: 'p2', reactionTimeMs: 250, eliminated: false },
    ]

    await finalizeRound(ROUND_ID, GAME_TOKEN, tied, ROUND_PLAY_ID)

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          type: 'tie',
          winners: expect.arrayContaining(['p1', 'p2']),
        }),
      })
    )
  })
})
