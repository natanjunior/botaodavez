# Testing Strategy Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Vitest suite with `finalize-round` unit tests, 3 API route test files, and one boundary case for `timing.ts` — all running with `npm test`, no external services.

**Architecture:** Self-contained `vi.mock()` factories in each test file (Vitest hoists these before imports); mock references obtained by importing the already-mocked module; `beforeEach` sets happy-path defaults, individual tests override for error cases.

**Tech Stack:** Vitest 2.x, jsdom, Next.js 15 App Router (`NextRequest`, `Promise<params>`), Prisma 5, Supabase server client.

---

## Chunk 1: Layer 1 — timing boundary + finalize-round tests

### Task 1: Add boundary case to `timing.test.ts`

**Files:**
- Modify: `src/lib/__tests__/timing.test.ts`

- [ ] **Step 1: Add the boundary test**

Open `src/lib/__tests__/timing.test.ts` and add inside the existing `describe('calculateRemainingYellow', ...)` block, after the last `it()`:

```ts
it('returns 0 when yellowEndsAt is exactly now (boundary)', () => {
  const endsAt = new Date(Date.now())
  const remaining = calculateRemainingYellow(endsAt)
  expect(remaining).toBeGreaterThanOrEqual(0)
  expect(remaining).toBeLessThanOrEqual(1) // at most 1ms drift
})
```

- [ ] **Step 2: Run and verify it passes**

```bash
cd D:/Dev/wsprojects/botaodavez
npx vitest run src/lib/__tests__/timing.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/timing.test.ts
git commit -m "test: add boundary case for calculateRemainingYellow"
```

---

### Task 2: Create `finalize-round.test.ts`

**Files:**
- Create: `src/lib/__tests__/finalize-round.test.ts`

This tests `src/lib/finalize-round.ts` directly. The function has I/O (Prisma + Supabase), so it needs mocks. The function signature is:

```ts
finalizeRound(
  roundId: string,
  gameToken: string,
  results: Array<{ participantId: string; reactionTimeMs: number | null; eliminated: boolean }>,
  roundPlayId: string
): Promise<void>
```

What it does internally:
1. `prisma.roundPlay.updateMany({ where: { id: roundPlayId, finishedAt: null }, data: { finishedAt: new Date() } })` — atomic guard, returns `{ count: number }`
2. If `count === 0`, returns immediately (race condition guard)
3. Calls `calculateRoundResult(results)` (pure, no mock needed)
4. `prisma.roundPlayResult.updateMany(...)` once per result (in a `Promise.all`)
5. `prisma.round.update({ where: { id: roundId }, data: { status: 'finished' } })`
6. `prisma.participant.findMany({ where: { id: { in: [...] } } })`
7. `createServiceClient()` then `.channel(...).send(...)` broadcast

- [ ] **Step 1: Create the test file**

Create `src/lib/__tests__/finalize-round.test.ts`:

```ts
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
```

- [ ] **Step 2: Run and verify all 5 tests pass**

```bash
npx vitest run src/lib/__tests__/finalize-round.test.ts
```

Expected: 5 tests PASS. If any fail, check that the mock factories are at the very top of the file (before any import other than the vi.mock calls themselves).

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/finalize-round.test.ts
git commit -m "test: add finalize-round tests with race condition guard"
```

---

## Chunk 2: API route tests — rounds-plays and rounds-stop

### Task 3: Create `rounds-plays.test.ts`

**Files:**
- Create: `src/app/api/__tests__/rounds-plays.test.ts`

This tests `POST /api/rounds/[id]/plays`. The handler:
1. Gets user via `createClient().auth.getUser()`
2. Finds round (includes `game`, `roundParticipants`)
3. Checks `round.game.adminId === user.id`
4. Validates transition via `validateRoundTransition`
5. Creates `roundPlay`, updates `round.status = 'active'`
6. Broadcasts `round_start` via `createServiceClient`
7. Schedules timeout via `after()` (mocked as no-op)

The `next/server` mock must spread the real module and only replace `after`, to preserve `NextRequest` and `NextResponse`.

- [ ] **Step 1: Create the test file**

```bash
mkdir -p D:/Dev/wsprojects/botaodavez/src/app/api/__tests__
```

Create `src/app/api/__tests__/rounds-plays.test.ts`:

```ts
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
```

- [ ] **Step 2: Run and verify all 8 tests pass**

```bash
npx vitest run src/app/api/__tests__/rounds-plays.test.ts
```

Expected: 8 tests PASS.

> **Troubleshooting**: If `NextRequest` is not a constructor in jsdom, ensure the `next/server` mock uses `importOriginal` to preserve the real implementations. If the import path for the handler (`../rounds/[id]/plays/route`) resolves incorrectly, check that the test file is at `src/app/api/__tests__/` — one level above `src/app/api/rounds/`.
>
> If you see `generateYellowDuration is not a function` errors, verify the `vi.mock('@/lib/timing', ...)` factory is at the very top of the file (before any other statement except other `vi.mock` calls).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/__tests__/rounds-plays.test.ts
git commit -m "test: add API route tests for POST rounds/[id]/plays"
```

---

### Task 4: Create `rounds-stop.test.ts`

**Files:**
- Create: `src/app/api/__tests__/rounds-stop.test.ts`

The `PATCH /api/rounds/[id]/stop` handler:
1. Gets user via `createClient().auth.getUser()`
2. Finds round (includes `game`)
3. Checks ownership
4. Updates `round.status = 'stopped'`
5. Broadcasts `round_stopped`

Note: this handler does NOT check round status before stopping — any authenticated, owned, existing round will be stopped unconditionally.

- [ ] **Step 1: Create the test file**

Create `src/app/api/__tests__/rounds-stop.test.ts`:

```ts
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
```

- [ ] **Step 2: Run and verify all 5 tests pass**

```bash
npx vitest run src/app/api/__tests__/rounds-stop.test.ts
```

Expected: 5 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/__tests__/rounds-stop.test.ts
git commit -m "test: add API route tests for PATCH rounds/[id]/stop"
```

---

## Chunk 3: API route test — plays-results

### Task 5: Create `plays-results.test.ts`

**Files:**
- Create: `src/app/api/__tests__/plays-results.test.ts`

This is the most complex route to test. The handler:
1. Uses `prisma.$transaction` with a callback
2. Inside transaction: `tx.roundPlay.findUnique` (includes `round.game`, `round.roundParticipants`, `results`)
3. Checks `!roundPlay` → 404; `roundPlay.finishedAt` → 200 early return; `round.status !== 'active'` → 200 early return
4. Checks for duplicate result (`results.some(r => r.participantId === participantId)`) → returns without creating
5. Creates `tx.roundPlayResult.create`
6. Sets `shouldFinalize = true` if `results.length + 1 >= expected`
7. After transaction: if `shouldFinalize`, calls `prisma.roundPlay.findUnique` again then `finalizeRound`

**Important**: Since `$transaction` mock calls the callback with `prisma` as `tx`, both `tx.roundPlay.findUnique` (inside transaction) and `prisma.roundPlay.findUnique` (after transaction, for finalization) use the same mock. Use `mockResolvedValueOnce` for the first call and `mockResolvedValue` for the second.

- [ ] **Step 1: Create the test file**

Create `src/app/api/__tests__/plays-results.test.ts`:

```ts
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
```

- [ ] **Step 2: Run and verify all 7 tests pass**

```bash
npx vitest run src/app/api/__tests__/plays-results.test.ts
```

Expected: 7 tests PASS.

> **Troubleshooting the `$transaction` mock**: The route uses `prisma.$transaction(async (tx) => { ... })`. The mock calls the callback with `prisma` as `tx`. This means `tx.roundPlay.findUnique` resolves to `vi.mocked(prisma.roundPlay.findUnique)`. If the callback receives the wrong `tx`, check that `mockImplementation((fn) => fn(prisma))` is in `beforeEach` after `vi.clearAllMocks()`.

> **Troubleshooting double `findUnique`**: For the "last result" test, `prisma.roundPlay.findUnique` is called twice: once inside the transaction (returns the round play with existing results) and once after (returns the round play with all results including the new one). Use `mockResolvedValueOnce` for the first and `mockResolvedValue` for the second to control each call independently.

- [ ] **Step 3: Run the full test suite to confirm nothing is broken**

```bash
npx vitest run
```

Expected: all tests PASS (existing 4 unit tests + 1 timing boundary + 5 finalize-round + 8 rounds-plays + 5 rounds-stop + 7 plays-results = 30 total).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/__tests__/plays-results.test.ts
git commit -m "test: add API route tests for POST plays/[id]/results"
```
