# Botão da Vez — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multiplayer reaction-time web app (PWA) where family members tap a color-changing button to decide whose turn it is.

**Architecture:** Next.js 15 App Router on Vercel Hobby. Supabase Realtime (Broadcast + Presence) replaces Socket.io — no custom server. Admin controls rounds via REST API + Supabase Auth JWT. Participants are anonymous (localStorage identity). Business logic lives in pure functions tested with Vitest.

**Tech Stack:** Next.js 15, TypeScript (strict), TailwindCSS v4, Supabase (Auth + Realtime + Postgres), Prisma, Vitest, @ducanh2912/next-pwa, next-themes, DiceBear API

**Spec:** `docs/superpowers/specs/2026-03-14-botao-da-vez-design.md`

---

## File Map

```
src/
├── app/
│   ├── layout.tsx                          root layout (ThemeProvider, fonts)
│   ├── page.tsx                            home — token input
│   ├── globals.css                         Tailwind v4 + CSS custom properties
│   ├── admin/
│   │   ├── page.tsx                        admin login
│   │   ├── dashboard/page.tsx              list games
│   │   └── game/[id]/page.tsx              manage game
│   ├── play/[token]/page.tsx               participant entry (name + avatar)
│   ├── game/[token]/page.tsx               game screen (button or spectator)
│   └── api/
│       ├── auth/login/route.ts
│       ├── auth/logout/route.ts
│       ├── games/route.ts                  POST create game | GET list admin games
│       ├── games/[token]/route.ts          GET validate token (public)
│       ├── games/[id]/route.ts             GET game by DB id (admin)
│       ├── games/[id]/participants/route.ts POST join game
│       ├── games/[id]/rounds/route.ts      POST create round
│       ├── rounds/[id]/stop/route.ts       PATCH stop round
│       ├── rounds/[id]/plays/route.ts      POST start play (schedules timeout via after())
│       └── plays/[id]/results/route.ts     POST submit result (transaction-safe)
├── components/
│   ├── ui/
│   │   ├── analog-button.tsx
│   │   ├── led-indicator.tsx
│   │   ├── segment-display.tsx
│   │   ├── panel-section.tsx
│   │   ├── toggle-switch.tsx
│   │   └── game-token-display.tsx
│   ├── admin/
│   │   ├── game-list.tsx
│   │   ├── participant-list.tsx
│   │   ├── team-manager.tsx
│   │   └── round-control.tsx
│   └── game/
│       ├── game-button.tsx             main round button (all states)
│       ├── spectator-view.tsx
│       └── round-result.tsx
├── lib/
│   ├── game-logic.ts                   calculateRoundResult (pure, tested)
│   ├── token.ts                        generateToken (pure, tested)
│   ├── round.ts                        canStartRound, round validations (pure, tested)
│   ├── timing.ts                       calculateYellowEndsAt, calculateRemainingYellow (pure, tested)
│   ├── prisma.ts                       Prisma singleton
│   ├── utils.ts                        cn() className helper
│   ├── finalize-round.ts               shared round finalisation helper (used by timeout + result route)
│   └── supabase/
│       ├── client.ts                   browser Supabase client
│       ├── server.ts                   server Supabase client (RSC + route handlers)
│       └── realtime.ts                 typed Broadcast + Presence helpers (created in Task 10)
├── hooks/
│   ├── use-game-channel.ts             subscribe to game:token Broadcast channel
│   ├── use-presence.ts                 track online participants
│   └── use-participant.ts              localStorage participant identity
├── types/
│   └── index.ts                        shared TypeScript types
└── test/
    └── setup.ts                        Vitest global setup

prisma/schema.prisma
vitest.config.ts
```

---

## Chunk 1: Foundation + Design System

### Task 1: Project Init

**Files:**
- Create: all root config files

- [ ] **Step 1: Scaffold Next.js 15 app**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Accept all defaults. Choose: TypeScript ✓, ESLint ✓, Tailwind ✓, `src/` ✓, App Router ✓, `@/*` alias ✓.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install prisma @prisma/client
npm install next-themes @ducanh2912/next-pwa
npm install clsx tailwind-merge
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @types/node
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

Add to `package.json` scripts:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 4: Configure TypeScript strict mode**

In `tsconfig.json`, ensure:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

- [ ] **Step 5: Verify setup**

```bash
npm run test:run
```
Expected: no tests found, exit 0.

```bash
npm run dev
```
Expected: app running on localhost:3000.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 app with Vitest"
```

---

### Task 2: Environment + Supabase Client

**Files:**
- Create: `.env.local`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`

- [ ] **Step 1: Create `.env.local`**

```bash
# .env.local — never commit this file
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get values from: Supabase Dashboard → Settings → API.

- [ ] **Step 2: Create browser Supabase client**

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Create server Supabase client**

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

export async function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Supabase client setup"
```

---

### Task 3: Prisma Schema + Migration

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write schema**

Replace `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Administrator {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  games        Game[]
  @@map("administrators")
}

model Game {
  id           String        @id @default(uuid())
  token        String        @unique @db.VarChar(6)
  adminId      String        @map("admin_id")
  admin        Administrator @relation(fields: [adminId], references: [id])
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("updated_at")
  teams        Team[]
  participants Participant[]
  rounds       Round[]
  @@map("games")
}

model Team {
  id                String             @id @default(uuid())
  gameId            String             @map("game_id")
  game              Game               @relation(fields: [gameId], references: [id], onDelete: Cascade)
  name              String
  color             String             @db.VarChar(7)
  createdAt         DateTime           @default(now()) @map("created_at")
  participants      Participant[]
  roundParticipants RoundParticipant[]
  @@map("teams")
}

model Participant {
  id                String             @id @default(uuid())
  gameId            String             @map("game_id")
  game              Game               @relation(fields: [gameId], references: [id], onDelete: Cascade)
  teamId            String?            @map("team_id")
  team              Team?              @relation(fields: [teamId], references: [id], onDelete: SetNull)
  name              String
  avatarSeed        String             @map("avatar_seed")
  lastSeen          DateTime?          @map("last_seen")
  createdAt         DateTime           @default(now()) @map("created_at")
  roundParticipants RoundParticipant[]
  roundPlayResults  RoundPlayResult[]
  @@map("participants")
}

model Round {
  id                String             @id @default(uuid())
  gameId            String             @map("game_id")
  game              Game               @relation(fields: [gameId], references: [id], onDelete: Cascade)
  status            String             @default("waiting") @db.VarChar(20)
  createdAt         DateTime           @default(now()) @map("created_at")
  roundParticipants RoundParticipant[]
  roundPlays        RoundPlay[]
  @@map("rounds")
}

model RoundParticipant {
  id            String      @id @default(uuid())
  roundId       String      @map("round_id")
  round         Round       @relation(fields: [roundId], references: [id], onDelete: Cascade)
  participantId String      @map("participant_id")
  participant   Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)
  teamId        String?     @map("team_id")
  team          Team?       @relation(fields: [teamId], references: [id], onDelete: SetNull)
  @@map("round_participants")
}

model RoundPlay {
  id               String            @id @default(uuid())
  roundId          String            @map("round_id")
  round            Round             @relation(fields: [roundId], references: [id], onDelete: Cascade)
  yellowDurationMs Int               @map("yellow_duration_ms")
  yellowEndsAt     DateTime          @map("yellow_ends_at")
  startedAt        DateTime          @default(now()) @map("started_at")
  finishedAt       DateTime?         @map("finished_at")
  results          RoundPlayResult[]
  @@map("round_plays")
}

model RoundPlayResult {
  id             String      @id @default(uuid())
  roundPlayId    String      @map("round_play_id")
  roundPlay      RoundPlay   @relation(fields: [roundPlayId], references: [id], onDelete: Cascade)
  participantId  String      @map("participant_id")
  participant    Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)
  reactionTimeMs Int?        @map("reaction_time_ms")
  eliminated     Boolean     @default(false)
  rank           Int?
  createdAt      DateTime    @default(now()) @map("created_at")
  @@map("round_play_results")
}
```

- [ ] **Step 3: Add Supabase DB URLs to `.env.local`**

```bash
# from Supabase: Settings → Database → Connection string
DATABASE_URL="postgresql://postgres.xxx:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Expected: migration created and applied, client generated.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema and initial migration"
```

---

### Task 4: Business Logic — Pure Functions + Tests

**Files:**
- Create: `src/lib/token.ts`, `src/lib/game-logic.ts`, `src/lib/timing.ts`, `src/lib/round.ts`
- Create: `src/lib/__tests__/token.test.ts`, `src/lib/__tests__/game-logic.test.ts`, `src/lib/__tests__/timing.test.ts`, `src/lib/__tests__/round.test.ts`

- [ ] **Step 1: Write failing tests for token generation**

```typescript
// src/lib/__tests__/token.test.ts
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
```

- [ ] **Step 2: Run to verify failure**

```bash
npm run test:run -- src/lib/__tests__/token.test.ts
```
Expected: FAIL — `token` module not found.

- [ ] **Step 3: Implement token.ts**

```typescript
// src/lib/token.ts
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export function generateToken(length = 6): string {
  return Array.from(
    { length },
    () => CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('')
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npm run test:run -- src/lib/__tests__/token.test.ts
```
Expected: 3 tests PASS.

- [ ] **Step 5: Write failing tests for game logic**

```typescript
// src/lib/__tests__/game-logic.test.ts
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
```

- [ ] **Step 6: Run to verify failure**

```bash
npm run test:run -- src/lib/__tests__/game-logic.test.ts
```
Expected: FAIL.

- [ ] **Step 7: Implement game-logic.ts**

```typescript
// src/lib/game-logic.ts
export type ParticipantResult = {
  participantId: string
  reactionTimeMs: number | null
  eliminated: boolean
}

export type RankedResult = ParticipantResult & { rank: number | null }

export type RoundOutcome = {
  type: 'winner' | 'tie' | 'no_winner'
  winners: string[]
  results: RankedResult[]
}

export function calculateRoundResult(results: ParticipantResult[]): RoundOutcome {
  const active = results.filter((r) => !r.eliminated && r.reactionTimeMs !== null)

  if (active.length === 0) {
    return {
      type: 'no_winner',
      winners: [],
      results: results.map((r) => ({ ...r, rank: null })),
    }
  }

  const sorted = [...active].sort((a, b) => a.reactionTimeMs! - b.reactionTimeMs!)
  const minTime = sorted[0]!.reactionTimeMs!
  const winners = sorted
    .filter((r) => r.reactionTimeMs === minTime)
    .map((r) => r.participantId)

  const rankedResults: RankedResult[] = results.map((r) => {
    if (r.eliminated || r.reactionTimeMs === null) return { ...r, rank: null }
    const rank = sorted.findIndex((s) => s.participantId === r.participantId) + 1
    return { ...r, rank }
  })

  return {
    type: winners.length > 1 ? 'tie' : 'winner',
    winners,
    results: rankedResults,
  }
}
```

- [ ] **Step 8: Write failing tests for timing**

```typescript
// src/lib/__tests__/timing.test.ts
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
})
```

- [ ] **Step 9: Run timing tests to verify failure**

```bash
npm run test:run -- src/lib/__tests__/timing.test.ts
```
Expected: FAIL — `timing` module not found.

- [ ] **Step 10: Implement timing.ts**

```typescript
// src/lib/timing.ts
export function generateYellowDuration(): number {
  return Math.floor(Math.random() * (3500 - 1500 + 1)) + 1500
}

export function calculateYellowEndsAt(yellowDurationMs: number): Date {
  return new Date(Date.now() + yellowDurationMs)
}

export function calculateRemainingYellow(yellowEndsAt: Date): number {
  return Math.max(0, yellowEndsAt.getTime() - Date.now())
}
```

- [ ] **Step 11: Run timing tests to verify pass**

```bash
npm run test:run -- src/lib/__tests__/timing.test.ts
```
Expected: 4 tests PASS.

- [ ] **Step 12: Write failing tests for round validations**

```typescript
// src/lib/__tests__/round.test.ts
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
```

- [ ] **Step 13: Run round tests to verify failure**

```bash
npm run test:run -- src/lib/__tests__/round.test.ts
```
Expected: FAIL.

- [ ] **Step 14: Implement round.ts**

```typescript
// src/lib/round.ts
import type { RoundStatus } from '@/types'

export type StartRoundCheck = { canStart: boolean; reason?: string }
export type TransitionCheck = { valid: boolean; reason?: string }

const VALID_TRANSITIONS: Record<RoundStatus, RoundStatus[]> = {
  waiting: ['active'],
  active: ['finished', 'stopped'],
  finished: ['active'], // play again (new RoundPlay)
  stopped: [],
}

export function canStartRound(selectedIds: string[], onlineIds: string[]): StartRoundCheck {
  if (selectedIds.length < 2) {
    return { canStart: false, reason: 'Mínimo de 2 participantes' }
  }
  const allOnline = selectedIds.every((id) => onlineIds.includes(id))
  if (!allOnline) {
    return { canStart: false, reason: 'Nem todos os participantes estão online' }
  }
  return { canStart: true }
}

export function validateRoundTransition(from: RoundStatus, to: RoundStatus): TransitionCheck {
  const allowed = VALID_TRANSITIONS[from] ?? []
  if (!allowed.includes(to)) {
    return { valid: false, reason: `Transição inválida: ${from} → ${to}` }
  }
  return { valid: true }
}
```

- [ ] **Step 15: Run round tests to verify pass**

```bash
npm run test:run -- src/lib/__tests__/round.test.ts
```
Expected: all tests PASS.

- [ ] **Step 16: Run all tests**

```bash
npm run test:run
```
Expected: all tests PASS.

- [ ] **Step 17: Commit**

```bash
git add -A
git commit -m "feat: add business logic pure functions with tests"
```

---

### Task 5: Shared Types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Define shared types**

```typescript
// src/types/index.ts

export type ButtonState = 'disabled' | 'yellow' | 'green' | 'red' | 'winner' | 'loser'

export type RoundStatus = 'waiting' | 'active' | 'finished' | 'stopped'

// Supabase Realtime Broadcast payloads
export type BroadcastRoundCreated = {
  round: { id: string; status: RoundStatus }
  participants: Array<{ id: string; name: string; avatarSeed: string; teamId: string | null }>
}

export type BroadcastRoundStart = {
  roundPlayId: string
  yellowDurationMs: number
  yellowEndsAt: string // ISO 8601
}

export type BroadcastRoundResult = {
  type: 'winner' | 'tie' | 'no_winner'
  winners: string[] // participantIds
  results: Array<{
    participantId: string
    name: string
    reactionTimeMs: number | null
    eliminated: boolean
    rank: number | null
  }>
}

export type BroadcastRoundStopped = {
  roundId: string
}

export type BroadcastTeamUpdated = {
  teams: Array<{ id: string; name: string; color: string }>
}

export type PresenceParticipant = {
  participantId: string
  name: string
}

// localStorage schema
export type StoredParticipant = {
  participantId: string
  avatarSeed: string
  gameToken: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/
git commit -m "feat: add shared TypeScript types"
```

---

### Task 6: Design System Components

**Files:**
- Create: all files under `src/components/ui/`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Create utils.ts first (required by all components)**

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

`clsx` and `tailwind-merge` were already installed in Task 1, Step 2.

- [ ] **Step 3: Configure TailwindCSS v4 + CSS custom properties**

Replace `src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-accent: #ff6b00;
  --color-surface-light: #e8e8e8;
  --color-bg-light: #d4d4d4;
  --color-surface-dark: #2a2a2a;
  --color-bg-dark: #1a1a1a;
  --font-mono-display: 'DSEG7 Classic', 'Courier New', monospace;
}

@layer base {
  body {
    @apply bg-[#d4d4d4] dark:bg-[#1a1a1a] text-zinc-900 dark:text-zinc-100;
    @apply font-sans antialiased;
  }
}

@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 8px 0 #166534, 0 0 20px rgba(74, 222, 128, 0.4), inset 0 2px 8px rgba(255,255,255,0.3); }
  50% { box-shadow: 0 8px 0 #166534, 0 0 40px rgba(74, 222, 128, 0.8), inset 0 2px 8px rgba(255,255,255,0.3); }
}

@keyframes yellow-pulse {
  0%, 100% { box-shadow: 0 8px 0 #b45309, inset 0 2px 8px rgba(255,255,255,0.3); }
  50% { box-shadow: 0 8px 0 #b45309, 0 0 30px rgba(250, 204, 21, 0.6), inset 0 2px 8px rgba(255,255,255,0.3); }
}
```

- [ ] **Step 4: Create AnalogButton**

```typescript
// src/components/ui/analog-button.tsx
'use client'
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const AnalogButton = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = 'secondary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'relative font-mono uppercase tracking-widest select-none',
          'rounded-lg border-b-4 transition-all duration-100',
          'active:border-b-0 active:translate-y-[3px]',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          size === 'sm' && 'px-3 py-1.5 text-xs',
          size === 'md' && 'px-5 py-2.5 text-sm',
          size === 'lg' && 'px-8 py-4 text-base',
          variant === 'primary' && [
            'bg-gradient-to-b from-orange-500 to-orange-600 border-orange-800 text-white',
            'shadow-[inset_0_1px_0_theme(colors.orange.400)]',
          ],
          variant === 'secondary' && [
            'bg-gradient-to-b from-zinc-300 to-zinc-400 dark:from-zinc-600 dark:to-zinc-700',
            'border-zinc-600 dark:border-zinc-900 text-zinc-800 dark:text-zinc-200',
            'shadow-[inset_0_1px_0_theme(colors.zinc.200)] dark:shadow-[inset_0_1px_0_theme(colors.zinc.500)]',
          ],
          variant === 'danger' && [
            'bg-gradient-to-b from-red-500 to-red-600 border-red-800 text-white',
            'shadow-[inset_0_1px_0_theme(colors.red.400)]',
          ],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
AnalogButton.displayName = 'AnalogButton'
```

- [ ] **Step 5: Create LEDIndicator**

```typescript
// src/components/ui/led-indicator.tsx
import { cn } from '@/lib/utils'

type LEDColor = 'green' | 'red' | 'yellow' | 'orange' | 'off'

const colorMap: Record<LEDColor, string> = {
  green: 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]',
  red: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]',
  yellow: 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.8)]',
  orange: 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]',
  off: 'bg-zinc-600 dark:bg-zinc-700',
}

interface Props {
  color: LEDColor
  size?: 'sm' | 'md'
  className?: string
}

export function LEDIndicator({ color, size = 'sm', className }: Props) {
  return (
    <span
      className={cn(
        'inline-block rounded-full',
        size === 'sm' && 'w-2 h-2',
        size === 'md' && 'w-3 h-3',
        colorMap[color],
        className
      )}
    />
  )
}
```

- [ ] **Step 6: Create SegmentDisplay**

```typescript
// src/components/ui/segment-display.tsx
import { cn } from '@/lib/utils'

interface Props {
  value: string | number
  label?: string
  className?: string
}

export function SegmentDisplay({ value, label, className }: Props) {
  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      {label && (
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
      )}
      <div className="bg-zinc-900 dark:bg-black px-3 py-1.5 rounded-md border border-zinc-700">
        <span
          className="font-mono text-green-400 tabular-nums"
          style={{ fontFamily: 'var(--font-mono-display)', letterSpacing: '0.15em' }}
        >
          {value}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create PanelSection**

```typescript
// src/components/ui/panel-section.tsx
import { cn } from '@/lib/utils'

interface Props {
  title?: string
  children: React.ReactNode
  className?: string
}

export function PanelSection({ title, children, className }: Props) {
  return (
    <div
      className={cn(
        'rounded-xl p-4',
        'bg-[#e8e8e8] dark:bg-[#2a2a2a]',
        'border border-zinc-300 dark:border-zinc-700',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.1)]',
        'dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(0,0,0,0.3)]',
        className
      )}
    >
      {title && (
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 mb-3">
          {title}
        </p>
      )}
      {children}
    </div>
  )
}
```

- [ ] **Step 8: Create GameTokenDisplay**

```typescript
// src/components/ui/game-token-display.tsx
import { SegmentDisplay } from './segment-display'

interface Props {
  token: string
}

export function GameTokenDisplay({ token }: Props) {
  return <SegmentDisplay value={token} label="Código do game" />
}
```

- [ ] **Step 9: Create ToggleSwitch**

```typescript
// src/components/ui/toggle-switch.tsx
'use client'
import { cn } from '@/lib/utils'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  className?: string
}

export function ToggleSwitch({ checked, onChange, label, className }: Props) {
  return (
    <label className={cn('flex items-center gap-3 cursor-pointer', className)}>
      <button
        role="switch"
        aria-checked={checked}
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-12 h-6 rounded-full transition-colors duration-200',
          'border-2 border-zinc-600',
          'shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]',
          checked ? 'bg-orange-500 border-orange-700' : 'bg-zinc-700 dark:bg-zinc-800'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200',
            'bg-gradient-to-b from-zinc-200 to-zinc-400',
            'shadow-[0_2px_4px_rgba(0,0,0,0.5)]',
            checked ? 'translate-x-6' : 'translate-x-0.5'
          )}
        />
      </button>
      {label && (
        <span className="font-mono text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
      )}
    </label>
  )
}
```

- [ ] **Step 10: Configure PWA + themes**

```typescript
// next.config.ts
import type { NextConfig } from 'next'
import withPWA from '@ducanh2912/next-pwa'

const nextConfig: NextConfig = {
  // your config
}

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
})(nextConfig)
```

Create `public/manifest.json`:
```json
{
  "name": "Botão da Vez",
  "short_name": "BotãoDaVez",
  "description": "Quem aperta primeiro, fica com a vez!",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a1a",
  "theme_color": "#ff6b00",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Configure `src/app/layout.tsx` with ThemeProvider:
```typescript
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 11: Run dev and visually verify components render**

```bash
npm run dev
```

Create a temporary `/test-ui` route to render the design system components and verify they look correct.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: add design system components (skeuomorphic)"
```

---

## Chunk 2: Auth + Games

### Task 7: Admin Authentication

**Files:**
- Create: `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`
- Create: `src/app/admin/page.tsx`
- Create: `src/middleware.ts`

- [ ] **Step 1: Create login API route**

```typescript
// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }

  // Ensure Administrator record exists (id = Supabase Auth user.id)
  const { prisma } = await import('@/lib/prisma')
  await prisma.administrator.upsert({
    where: { id: data.user.id },
    update: {},
    create: {
      id: data.user.id,
      email: data.user.email!,
      passwordHash: '', // managed by Supabase Auth
    },
  })

  return NextResponse.json({ user: { id: data.user.id, email: data.user.email } })
}
```

- [ ] **Step 2: Create Prisma singleton**

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 3: Create logout route**

```typescript
// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Create middleware for admin route protection**

```typescript
// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          ),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Unauthenticated trying to access protected admin routes
  if (!user && request.nextUrl.pathname.startsWith('/admin/')) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Authenticated admin trying to visit the login page — redirect to dashboard
  if (user && request.nextUrl.pathname === '/admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

- [ ] **Step 5: Build admin login page**

```typescript
// src/app/admin/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PanelSection } from '@/components/ui/panel-section'
import { AnalogButton } from '@/components/ui/analog-button'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (res.ok) {
      router.push('/admin/dashboard')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Erro ao fazer login')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <PanelSection title="Admin Login" className="w-full max-w-sm">
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="EMAIL"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-zinc-900 text-green-400 font-mono text-sm px-3 py-2 rounded border border-zinc-700 outline-none focus:border-orange-500 uppercase placeholder:text-zinc-600"
          />
          <input
            type="password"
            placeholder="SENHA"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-zinc-900 text-green-400 font-mono text-sm px-3 py-2 rounded border border-zinc-700 outline-none focus:border-orange-500"
          />
          {error && <p className="text-red-500 text-xs font-mono">{error}</p>}
          <AnalogButton type="submit" variant="primary" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </AnalogButton>
        </form>
      </PanelSection>
    </main>
  )
}
```

- [ ] **Step 6: Verify login flow manually**

1. Create an admin user in Supabase Dashboard → Auth → Users
2. Run `npm run dev`
3. Navigate to `/admin` and log in
4. Should redirect to `/admin/dashboard` (404 for now)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: admin authentication with Supabase Auth"
```

---

### Task 8: Game Creation

**Files:**
- Create: `src/app/api/games/route.ts`, `src/app/api/games/[token]/route.ts`
- Create: `src/app/admin/dashboard/page.tsx`

- [ ] **Step 1: Create games API route**

```typescript
// src/app/api/games/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/token'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Generate unique token (retry on collision)
  let token: string = ''
  let attempts = 0
  do {
    token = generateToken()
    const existing = await prisma.game.findUnique({ where: { token } })
    if (!existing) break
    attempts++
  } while (attempts < 10)

  if (attempts >= 10) {
    return NextResponse.json({ error: 'Não foi possível gerar token único. Tente novamente.' }, { status: 500 })
  }

  const game = await prisma.game.create({
    data: { token, adminId: user.id },
  })

  return NextResponse.json({ game })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const games = await prisma.game.findMany({
    where: { adminId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ games })
}
```

- [ ] **Step 2: Create token validation route**

```typescript
// src/app/api/games/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const game = await prisma.game.findUnique({
    where: { token: token.toUpperCase() },
    include: {
      teams: true,
      participants: true,
      // Include active round data for client reconnect state restoration
      rounds: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          roundParticipants: { include: { participant: true } },
          roundPlays: { orderBy: { startedAt: 'desc' }, take: 1 },
        },
      },
    },
  })

  if (!game) {
    return NextResponse.json({ error: 'Game não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ game })
}
```

- [ ] **Step 3: Build admin dashboard**

```typescript
// src/app/admin/dashboard/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PanelSection } from '@/components/ui/panel-section'
import { AnalogButton } from '@/components/ui/analog-button'
import { GameTokenDisplay } from '@/components/ui/game-token-display'

type Game = { id: string; token: string; createdAt: string }

export default function DashboardPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/games').then((r) => r.json()).then((d) => setGames(d.games ?? []))
  }, [])

  async function createGame() {
    setLoading(true)
    const res = await fetch('/api/games', { method: 'POST' })
    const { game } = await res.json()
    router.push(`/admin/game/${game.id}`)
  }

  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto">
      <PanelSection title="Meus Games" className="mb-4">
        <AnalogButton variant="primary" onClick={createGame} disabled={loading}>
          {loading ? 'Criando...' : '+ Novo Game'}
        </AnalogButton>
      </PanelSection>

      <div className="flex flex-col gap-3">
        {games.map((game) => (
          <PanelSection key={game.id}>
            <div className="flex items-center justify-between">
              <GameTokenDisplay token={game.token} />
              <AnalogButton
                size="sm"
                onClick={() => router.push(`/admin/game/${game.id}`)}
              >
                Abrir
              </AnalogButton>
            </div>
          </PanelSection>
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Build home page (token input)**

```typescript
// src/app/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PanelSection } from '@/components/ui/panel-section'
import { AnalogButton } from '@/components/ui/analog-button'

export default function HomePage() {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)
    setError('')

    const res = await fetch(`/api/games/${token.toUpperCase()}`)
    if (res.ok) {
      router.push(`/play/${token.toUpperCase()}`)
    } else {
      setError('Código inválido. Verifique e tente novamente.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center">
        <h1 className="font-mono text-3xl font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
          Botão da Vez
        </h1>
        <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest mt-1">
          Quem aperta primeiro, fica com a vez
        </p>
      </div>

      <PanelSection title="Entrar no Game" className="w-full max-w-xs">
        <form onSubmit={handleJoin} className="flex flex-col gap-3">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value.toUpperCase())}
            placeholder="CÓDIGO"
            maxLength={6}
            className="bg-zinc-900 text-green-400 font-mono text-2xl text-center tracking-[0.4em] px-3 py-3 rounded border border-zinc-700 outline-none focus:border-orange-500 uppercase"
          />
          {error && <p className="text-red-500 text-xs font-mono text-center">{error}</p>}
          <AnalogButton type="submit" variant="primary" disabled={loading || token.length < 6}>
            {loading ? 'Verificando...' : 'Entrar'}
          </AnalogButton>
        </form>
      </PanelSection>

      <a href="/admin" className="text-xs font-mono text-zinc-500 uppercase tracking-widest hover:text-orange-500">
        Admin →
      </a>
    </main>
  )
}
```

- [ ] **Step 5: Verify end-to-end manually**

1. Login as admin → dashboard
2. Create game → redirects to game page (404 for now)
3. Copy token → enter on home page → validates correctly

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: game creation and token validation"
```

---

## Chunk 3: Participants

### Task 9: Participant Entry Flow

**Files:**
- Create: `src/app/api/games/[id]/participants/route.ts`
- Create: `src/app/play/[token]/page.tsx`
- Create: `src/hooks/use-participant.ts`

- [ ] **Step 1: Create participant join API**

```typescript
// src/app/api/games/[id]/participants/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params
  const { name, avatarSeed } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }

  const game = await prisma.game.findUnique({ where: { id: gameId } })
  if (!game) {
    return NextResponse.json({ error: 'Game não encontrado' }, { status: 404 })
  }

  const participant = await prisma.participant.create({
    data: {
      gameId,
      name: name.trim(),
      avatarSeed: avatarSeed ?? name.trim(),
    },
  })

  return NextResponse.json({ participant })
}
```

- [ ] **Step 2: Create participant identity hook**

```typescript
// src/hooks/use-participant.ts
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
```

- [ ] **Step 3: Build participant entry page**

```typescript
// src/app/play/[token]/page.tsx
'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { PanelSection } from '@/components/ui/panel-section'
import { AnalogButton } from '@/components/ui/analog-button'
import { useParticipant } from '@/hooks/use-participant'

const DICEBEAR_STYLES = ['adventurer', 'avataaars', 'bottts', 'fun-emoji', 'lorelei', 'micah']

export default function PlayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [name, setName] = useState('')
  const [avatarSeed, setAvatarSeed] = useState(() => Math.random().toString(36).slice(2))
  const [avatarStyle, setAvatarStyle] = useState('bottts')
  const [gameId, setGameId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { get, save } = useParticipant()
  const router = useRouter()

  useEffect(() => {
    // Fetch game + check for existing participant
    fetch(`/api/games/${token}`).then(async (r) => {
      if (!r.ok) { router.push('/'); return }
      const { game } = await r.json()
      setGameId(game.id)

      const stored = get(token)
      if (stored) {
        // Verify participant still exists
        router.push(`/game/${token}`)
      }
    })
  }, [token, get, router])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!gameId || !name.trim()) return
    setLoading(true)

    const res = await fetch(`/api/games/${gameId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), avatarSeed }),
    })

    if (res.ok) {
      const { participant } = await res.json()
      save({ participantId: participant.id, avatarSeed, gameToken: token })
      router.push(`/game/${token}`)
    } else {
      setLoading(false)
    }
  }

  const avatarUrl = `https://api.dicebear.com/9.x/${avatarStyle}/svg?seed=${avatarSeed}`

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-6">
      <PanelSection title={`Game ${token}`} className="w-full max-w-sm">
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          {/* Avatar preview */}
          <div className="flex flex-col items-center gap-3">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-24 h-24 rounded-full border-4 border-zinc-600 bg-zinc-800"
            />
            <div className="flex gap-2 flex-wrap justify-center">
              {DICEBEAR_STYLES.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setAvatarStyle(style)}
                  className={`px-2 py-1 text-xs font-mono uppercase rounded border ${
                    avatarStyle === style
                      ? 'border-orange-500 text-orange-500'
                      : 'border-zinc-600 text-zinc-400'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setAvatarSeed(Math.random().toString(36).slice(2))}
              className="text-xs font-mono text-zinc-500 hover:text-orange-500 uppercase tracking-widest"
            >
              ↻ Outro avatar
            </button>
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="SEU NOME"
            maxLength={20}
            className="bg-zinc-900 text-green-400 font-mono text-sm text-center tracking-widest px-3 py-2 rounded border border-zinc-700 outline-none focus:border-orange-500 uppercase"
          />

          <AnalogButton
            type="submit"
            variant="primary"
            disabled={loading || !name.trim()}
          >
            {loading ? 'Entrando...' : 'Entrar no Game'}
          </AnalogButton>
        </form>
      </PanelSection>
    </main>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: participant entry flow with DiceBear avatar"
```

---

### Task 10: Realtime Channel + Presence

**Files:**
- Create: `src/lib/supabase/realtime.ts`
- Create: `src/hooks/use-game-channel.ts`
- Create: `src/hooks/use-presence.ts`

- [ ] **Step 1: Create typed realtime helpers**

```typescript
// src/lib/supabase/realtime.ts
import { createClient } from './client'
import type {
  BroadcastRoundCreated,
  BroadcastRoundStart,
  BroadcastRoundResult,
  BroadcastRoundStopped,
  BroadcastTeamUpdated,
} from '@/types'

export type GameChannelEvents = {
  round_created: BroadcastRoundCreated
  round_start: BroadcastRoundStart
  round_result: BroadcastRoundResult
  round_stopped: BroadcastRoundStopped
  team_updated: BroadcastTeamUpdated
}

export function createGameChannel(token: string) {
  const supabase = createClient()
  return supabase.channel(`game:${token}`)
}
```

- [ ] **Step 2: Create Presence hook**

```typescript
// src/hooks/use-presence.ts
'use client'
import { useEffect, useState, useRef } from 'react'
import { createGameChannel } from '@/lib/supabase/realtime'
import type { PresenceParticipant } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function usePresence(token: string, self: PresenceParticipant | null) {
  const [online, setOnline] = useState<PresenceParticipant[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!self) return

    const channel = createGameChannel(token)
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceParticipant>()
        const participants = Object.values(state).flat()
        setOnline(participants)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(self)
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [token, self])

  return { online, onlineIds: online.map((p) => p.participantId) }
}
```

- [ ] **Step 3: Create game channel hook**

```typescript
// src/hooks/use-game-channel.ts
'use client'
import { useEffect, useRef } from 'react'
import { createGameChannel } from '@/lib/supabase/realtime'
import type { GameChannelEvents } from '@/lib/supabase/realtime'
import type { RealtimeChannel } from '@supabase/supabase-js'

type Handler<T extends keyof GameChannelEvents> = (payload: GameChannelEvents[T]) => void

export function useGameChannel<T extends keyof GameChannelEvents>(
  token: string,
  event: T,
  handler: Handler<T>
) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const channel = createGameChannel(token)

    channel
      .on('broadcast', { event }, (msg) => {
        handlerRef.current(msg.payload as GameChannelEvents[T])
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [token, event])
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: Supabase Realtime channel hooks (Broadcast + Presence)"
```

---

### Task 11: Admin Game View + Participant List

**Files:**
- Create: `src/app/admin/game/[id]/page.tsx`
- Create: `src/components/admin/participant-list.tsx`

- [ ] **Step 1: Build participant list component**

```typescript
// src/components/admin/participant-list.tsx
'use client'
import { LEDIndicator } from '@/components/ui/led-indicator'

type Participant = {
  id: string
  name: string
  avatarSeed: string
}

interface Props {
  participants: Participant[]
  onlineIds: string[]
  selectedIds: string[]
  onToggleSelect: (id: string) => void
}

export function ParticipantList({ participants, onlineIds, selectedIds, onToggleSelect }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {participants.length === 0 && (
        <p className="text-xs font-mono text-zinc-500 uppercase">Nenhum participante ainda</p>
      )}
      {participants.map((p) => {
        const isOnline = onlineIds.includes(p.id)
        const isSelected = selectedIds.includes(p.id)
        return (
          <button
            key={p.id}
            onClick={() => onToggleSelect(p.id)}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              isSelected
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-zinc-600 hover:border-zinc-400'
            }`}
          >
            <LEDIndicator color={isOnline ? 'green' : 'off'} />
            <img
              src={`https://api.dicebear.com/9.x/bottts/svg?seed=${p.avatarSeed}`}
              alt={p.name}
              className="w-8 h-8 rounded-full bg-zinc-800"
            />
            <span className="font-mono text-sm uppercase tracking-wider flex-1 text-left">
              {p.name}
            </span>
            {isSelected && (
              <span className="text-orange-500 text-xs font-mono">✓</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Build admin game page (skeleton)**

```typescript
// src/app/admin/game/[id]/page.tsx
'use client'
import { useEffect, useState, use } from 'react'
import { PanelSection } from '@/components/ui/panel-section'
import { AnalogButton } from '@/components/ui/analog-button'
import { GameTokenDisplay } from '@/components/ui/game-token-display'
import { ParticipantList } from '@/components/admin/participant-list'
import { usePresence } from '@/hooks/use-presence'

type Game = {
  id: string
  token: string
  participants: Array<{ id: string; name: string; avatarSeed: string }>
}

export default function AdminGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [game, setGame] = useState<Game | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const { onlineIds } = usePresence(game?.token ?? '', null)

  useEffect(() => {
    fetch(`/api/games/${id}`).then((r) => r.json()).then((d) => {
      // Note: this route expects token param, so we need a by-id route
      // See Task 12 for the admin-specific route
    })
  }, [id])

  function toggleSelect(participantId: string) {
    setSelectedIds((prev) =>
      prev.includes(participantId)
        ? prev.filter((id) => id !== participantId)
        : [...prev, participantId]
    )
  }

  if (!game) return <div className="p-4 font-mono text-sm">Carregando...</div>

  const canStart = selectedIds.length >= 2 && selectedIds.every((id) => onlineIds.includes(id))

  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto flex flex-col gap-4">
      <PanelSection>
        <GameTokenDisplay token={game.token} />
      </PanelSection>

      <PanelSection title="Participantes">
        <ParticipantList
          participants={game.participants}
          onlineIds={onlineIds}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      </PanelSection>

      <PanelSection title="Rodada">
        <AnalogButton
          variant="primary"
          disabled={!canStart}
          className="w-full"
        >
          {canStart ? 'Jogar' : `Selecione 2+ participantes online`}
        </AnalogButton>
      </PanelSection>
    </main>
  )
}
```

- [ ] **Step 3: Add admin game-by-id API route**

```typescript
// src/app/api/games/[id]/route.ts  (new file, by database id)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const game = await prisma.game.findFirst({
    where: { id, adminId: user.id },
    include: { participants: true, teams: true, rounds: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })

  if (!game) return NextResponse.json({ error: 'Game não encontrado' }, { status: 404 })
  return NextResponse.json({ game })
}
```

- [ ] **Step 4: Connect admin game page to API and verify participant list**

Update `src/app/admin/game/[id]/page.tsx` to use the new `/api/games/${id}` (by id) endpoint. Participants should appear in the list with green/grey LED indicators based on Presence.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: admin game view with participant list and online status"
```

---

## Chunk 4: Round Engine

### Task 12: Round Creation + Start

**Files:**
- Create: `src/app/api/games/[id]/rounds/route.ts`
- Create: `src/app/api/rounds/[id]/plays/route.ts`

- [ ] **Step 1: Create round API route**

```typescript
// src/app/api/games/[id]/rounds/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { canStartRound } from '@/lib/round'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: gameId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { participantIds } = await req.json()

  if (!Array.isArray(participantIds) || participantIds.length < 2) {
    return NextResponse.json({ error: 'Mínimo de 2 participantes' }, { status: 400 })
  }

  const round = await prisma.round.create({
    data: {
      gameId,
      status: 'waiting',
      roundParticipants: {
        create: participantIds.map((pid: string) => ({ participantId: pid })),
      },
    },
    include: { roundParticipants: { include: { participant: true } } },
  })

  // Broadcast round_created
  const { createServiceClient } = await import('@/lib/supabase/server')
  const serviceClient = await createServiceClient()
  const game = await prisma.game.findUnique({ where: { id: gameId } })
  await serviceClient.channel(`game:${game!.token}`).send({
    type: 'broadcast',
    event: 'round_created',
    payload: {
      round: { id: round.id, status: round.status },
      participants: round.roundParticipants.map((rp) => ({
        id: rp.participant.id,
        name: rp.participant.name,
        avatarSeed: rp.participant.avatarSeed,
        teamId: rp.teamId,
      })),
    },
  })

  return NextResponse.json({ round })
}
```

- [ ] **Step 2: Create round plays API route (start play) with timeout**

```typescript
// src/app/api/rounds/[id]/plays/route.ts
import { NextRequest, NextResponse, after } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { generateYellowDuration, calculateYellowEndsAt } from '@/lib/timing'
import { validateRoundTransition } from '@/lib/round'
import { finalizeRound } from '@/lib/finalize-round'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roundId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { game: true, roundParticipants: true },
  })
  if (!round) return NextResponse.json({ error: 'Rodada não encontrada' }, { status: 404 })

  const transition = validateRoundTransition(round.status as any, 'active')
  if (!transition.valid) {
    return NextResponse.json({ error: transition.reason }, { status: 409 })
  }

  const yellowDurationMs = generateYellowDuration()
  const yellowEndsAt = calculateYellowEndsAt(yellowDurationMs)

  const roundPlay = await prisma.roundPlay.create({
    data: { roundId, yellowDurationMs, yellowEndsAt },
  })
  await prisma.round.update({ where: { id: roundId }, data: { status: 'active' } })

  const serviceClient = await createServiceClient()
  await serviceClient.channel(`game:${round.game.token}`).send({
    type: 'broadcast',
    event: 'round_start',
    payload: {
      roundPlayId: roundPlay.id,
      yellowDurationMs,
      yellowEndsAt: yellowEndsAt.toISOString(),
    },
  })

  // Schedule timeout: if not all results arrive, finalise with missing participants
  const timeoutMs = yellowDurationMs + 10000
  after(async () => {
    await new Promise((resolve) => setTimeout(resolve, timeoutMs))
    const play = await prisma.roundPlay.findUnique({
      where: { id: roundPlay.id },
      include: { results: true, round: { include: { roundParticipants: true, game: true } } },
    })
    if (!play || play.finishedAt) return // already finalised
    if (play.round.status !== 'active') return

    // Fill in missing results as no-result (not eliminated, no time)
    const submittedIds = new Set(play.results.map((r) => r.participantId))
    const missing = play.round.roundParticipants.filter((rp) => !submittedIds.has(rp.participantId))
    if (missing.length > 0) {
      await prisma.roundPlayResult.createMany({
        data: missing.map((rp) => ({
          roundPlayId: play.id,
          participantId: rp.participantId,
          reactionTimeMs: null,
          eliminated: false,
        })),
        skipDuplicates: true,
      })
    }

    const allResults = await prisma.roundPlayResult.findMany({ where: { roundPlayId: play.id } })
    await finalizeRound(play.round.id, play.round.game.token, allResults, play.id)
  })

  return NextResponse.json({ roundPlay: { ...roundPlay, yellowEndsAt: yellowEndsAt.toISOString() } })
}
```

Create `src/lib/finalize-round.ts` (extracted helper shared by timeout and result route):

```typescript
// src/lib/finalize-round.ts
import { prisma } from '@/lib/prisma'
import { calculateRoundResult } from '@/lib/game-logic'
import { createServiceClient } from '@/lib/supabase/server'

export async function finalizeRound(
  roundId: string,
  gameToken: string,
  results: Array<{ participantId: string; reactionTimeMs: number | null; eliminated: boolean }>,
  roundPlayId: string
) {
  // Atomic guard: only one caller wins the race — the one that sets finishedAt
  const updated = await prisma.roundPlay.updateMany({
    where: { id: roundPlayId, finishedAt: null },
    data: { finishedAt: new Date() },
  })
  if (updated.count === 0) return // already finalised by a concurrent call

  const outcome = calculateRoundResult(results)

  await Promise.all(
    outcome.results.map((r) =>
      prisma.roundPlayResult.updateMany({
        where: { roundPlayId, participantId: r.participantId },
        data: { rank: r.rank },
      })
    )
  )

  await prisma.round.update({ where: { id: roundId }, data: { status: 'finished' } })

  const participants = await prisma.participant.findMany({
    where: { id: { in: results.map((r) => r.participantId) } },
  })

  const serviceClient = await createServiceClient()
  await serviceClient.channel(`game:${gameToken}`).send({
    type: 'broadcast',
    event: 'round_result',
    payload: {
      type: outcome.type,
      winners: outcome.winners,
      results: outcome.results.map((r) => ({
        ...r,
        name: participants.find((p) => p.id === r.participantId)?.name ?? '',
      })),
    },
  })
}
```

Add `src/lib/finalize-round.ts` to the File Map under `src/lib/`.
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: round creation and play start API routes"
```

---

### Task 13: Game Button Component

**Files:**
- Create: `src/components/game/game-button.tsx`

- [ ] **Step 1: Build the main round button**

```typescript
// src/components/game/game-button.tsx
'use client'
import { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import type { ButtonState } from '@/types'

const STATE_CONFIG: Record<ButtonState, {
  bg: string
  shadow: string
  label: string
  animate: string
  textColor: string
}> = {
  disabled: {
    bg: 'bg-zinc-700 dark:bg-zinc-800',
    shadow: 'shadow-[0_8px_0_#111,inset_0_2px_4px_rgba(255,255,255,0.05)]',
    label: 'AGUARDE',
    animate: '',
    textColor: 'text-zinc-500',
  },
  yellow: {
    bg: 'bg-yellow-400',
    shadow: '[animation:yellow-pulse_1.2s_ease-in-out_infinite]',
    label: 'ATENÇÃO!',
    animate: '',
    textColor: 'text-yellow-900',
  },
  green: {
    bg: 'bg-green-400',
    shadow: '[animation:glow-pulse_0.8s_ease-in-out_infinite]',
    label: 'VAI!',
    animate: '',
    textColor: 'text-green-900',
  },
  red: {
    bg: 'bg-red-700',
    shadow: 'shadow-[0_2px_0_#450a0a,inset_0_6px_12px_rgba(0,0,0,0.5)]',
    label: 'ELIMINADO',
    animate: '',
    textColor: 'text-red-200',
  },
  winner: {
    bg: 'bg-gradient-to-br from-yellow-300 via-green-400 to-emerald-400',
    shadow: 'shadow-[0_8px_0_#166534,0_0_60px_rgba(74,222,128,0.6),inset_0_2px_8px_rgba(255,255,255,0.4)]',
    label: 'VENCEDOR!',
    animate: '',
    textColor: 'text-emerald-900',
  },
  loser: {
    bg: 'bg-zinc-600 dark:bg-zinc-700',
    shadow: 'shadow-[0_4px_0_#111,inset_0_2px_4px_rgba(0,0,0,0.4)]',
    label: 'PERDEU',
    animate: '',
    textColor: 'text-zinc-400',
  },
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  state: ButtonState
  reactionTimeMs?: number | null
}

export function GameButton({ state, reactionTimeMs, className, ...props }: Props) {
  const config = STATE_CONFIG[state]
  const isInteractive = state === 'yellow' || state === 'green'

  return (
    <button
      disabled={!isInteractive}
      className={cn(
        'relative w-64 h-64 rounded-full select-none',
        'transition-all duration-150',
        'border-[6px] border-zinc-900/40',
        config.bg,
        config.shadow,
        config.animate,
        isInteractive && 'active:translate-y-2 cursor-pointer',
        !isInteractive && 'cursor-default',
        className
      )}
      {...props}
    >
      <div className="flex flex-col items-center gap-2">
        <span className={cn('font-mono text-2xl font-bold tracking-widest uppercase', config.textColor)}>
          {config.label}
        </span>
        {reactionTimeMs != null && (
          <span className={cn('font-mono text-sm', config.textColor)}>
            {reactionTimeMs}ms
          </span>
        )}
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: game button component with all visual states"
```

---

### Task 14: Result Submission + Processing

**Files:**
- Create: `src/app/api/plays/[id]/results/route.ts`
- Create: `src/app/api/rounds/[id]/stop/route.ts`

- [ ] **Step 1: Create result submission API (transaction-safe)**

```typescript
// src/app/api/plays/[id]/results/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { finalizeRound } from '@/lib/finalize-round'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roundPlayId } = await params
  const { participantId, reactionTimeMs, eliminated } = await req.json()

  // Use a DB-level atomic increment to determine if this submission triggers finalisation.
  // We use a raw SQL upsert + count to avoid the race condition where two concurrent
  // requests both read receivedCount < expectedCount and both call finalizeRound.
  let shouldFinalize = false

  try {
    await prisma.$transaction(async (tx) => {
      const roundPlay = await tx.roundPlay.findUnique({
        where: { id: roundPlayId },
        include: { round: { include: { game: true, roundParticipants: true } }, results: true },
      })

      if (!roundPlay) throw new Error('NOT_FOUND')
      if (roundPlay.finishedAt) throw new Error('ALREADY_DONE')
      if (roundPlay.round.status !== 'active') throw new Error('NOT_ACTIVE')

      // Idempotent: skip if already submitted
      const alreadySubmitted = roundPlay.results.some((r) => r.participantId === participantId)
      if (alreadySubmitted) return

      await tx.roundPlayResult.create({
        data: {
          roundPlayId,
          participantId,
          reactionTimeMs: eliminated ? null : (reactionTimeMs ?? null),
          eliminated: Boolean(eliminated),
        },
      })

      const newCount = roundPlay.results.length + 1
      const expected = roundPlay.round.roundParticipants.length
      if (newCount >= expected) {
        shouldFinalize = true
      }
    })
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') return NextResponse.json({ error: 'Jogada não encontrada' }, { status: 404 })
    if (e.message === 'NOT_ACTIVE' || e.message === 'ALREADY_DONE') return NextResponse.json({ ok: true })
    throw e
  }

  if (shouldFinalize) {
    const play = await prisma.roundPlay.findUnique({
      where: { id: roundPlayId },
      include: { results: true, round: { include: { game: true } } },
    })
    if (play && !play.finishedAt) {
      await finalizeRound(play.round.id, play.round.game.token, play.results, roundPlayId)
    }
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Create stop round route**

```typescript
// src/app/api/rounds/[id]/stop/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roundId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { game: true },
  })
  if (!round) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })

  await prisma.round.update({ where: { id: roundId }, data: { status: 'stopped' } })

  const serviceClient = await createServiceClient()
  await serviceClient.channel(`game:${round.game.token}`).send({
    type: 'broadcast',
    event: 'round_stopped',
    payload: { roundId },
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: result submission and round finalization API"
```

---

### Task 15: Game Screen — Player View

**Files:**
- Create: `src/app/game/[token]/page.tsx`
- Create: `src/components/game/round-result.tsx`
- Create: `src/components/game/spectator-view.tsx`

- [ ] **Step 1: Build round result component**

```typescript
// src/components/game/round-result.tsx
import type { BroadcastRoundResult } from '@/types'
import { SegmentDisplay } from '@/components/ui/segment-display'
import { PanelSection } from '@/components/ui/panel-section'

interface Props {
  result: BroadcastRoundResult
}

export function RoundResult({ result }: Props) {
  return (
    <PanelSection title="Resultado" className="w-full max-w-sm">
      <div className="flex flex-col gap-3">
        <div className="text-center">
          {result.type === 'winner' && (
            <p className="font-mono text-lg text-orange-500 uppercase tracking-widest">
              🏆 {result.results.find((r) => r.rank === 1)?.name}
            </p>
          )}
          {result.type === 'tie' && (
            <p className="font-mono text-lg text-yellow-400 uppercase tracking-widest">Empate!</p>
          )}
          {result.type === 'no_winner' && (
            <p className="font-mono text-lg text-zinc-400 uppercase tracking-widest">Sem vencedor</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {result.results
            .filter((r) => !r.eliminated && r.reactionTimeMs != null)
            .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
            .map((r) => (
              <div key={r.participantId} className="flex items-center justify-between">
                <span className="font-mono text-sm uppercase">{r.name}</span>
                <SegmentDisplay value={`${r.reactionTimeMs}ms`} />
              </div>
            ))}
        </div>
      </div>
    </PanelSection>
  )
}
```

- [ ] **Step 2: Build spectator view**

```typescript
// src/components/game/spectator-view.tsx
import { PanelSection } from '@/components/ui/panel-section'
import { LEDIndicator } from '@/components/ui/led-indicator'

interface Props {
  players: Array<{ id: string; name: string }>
  onlineIds: string[]
}

export function SpectatorView({ players, onlineIds }: Props) {
  return (
    <PanelSection title="Em disputa" className="w-full max-w-sm">
      <div className="flex flex-col gap-2">
        {players.map((p) => (
          <div key={p.id} className="flex items-center gap-3">
            <LEDIndicator color={onlineIds.includes(p.id) ? 'green' : 'off'} />
            <span className="font-mono text-sm uppercase tracking-wider">{p.name}</span>
          </div>
        ))}
      </div>
      <p className="text-xs font-mono text-zinc-500 mt-3 uppercase">Aguardando resultado...</p>
    </PanelSection>
  )
}
```

- [ ] **Step 3: Build main game page**

```typescript
// src/app/game/[token]/page.tsx
'use client'
import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { GameButton } from '@/components/game/game-button'
import { RoundResult } from '@/components/game/round-result'
import { SpectatorView } from '@/components/game/spectator-view'
import { PanelSection } from '@/components/ui/panel-section'
import { useParticipant } from '@/hooks/use-participant'
import { usePresence } from '@/hooks/use-presence'
import { useGameChannel } from '@/hooks/use-game-channel'
import { calculateRemainingYellow } from '@/lib/timing'
import type { ButtonState, BroadcastRoundCreated, BroadcastRoundStart, BroadcastRoundResult, PresenceParticipant } from '@/types'

export default function GamePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const { get } = useParticipant()
  const router = useRouter()

  const [participantId, setParticipantId] = useState<string | null>(null)
  const [buttonState, setButtonState] = useState<ButtonState>('disabled')
  const [roundPlayId, setRoundPlayId] = useState<string | null>(null)
  const [reactionStartTime, setReactionStartTime] = useState<number | null>(null)
  const [reactionTimeMs, setReactionTimeMs] = useState<number | null>(null)
  const [roundResult, setRoundResult] = useState<BroadcastRoundResult | null>(null)
  const [isInRound, setIsInRound] = useState(false)
  const [roundPlayers, setRoundPlayers] = useState<Array<{ id: string; name: string }>>([])

  // Resolve participant identity
  useEffect(() => {
    const stored = get(token)
    if (!stored) { router.push(`/play/${token}`); return }
    setParticipantId(stored.participantId)
  }, [token, get, router])

  const self: PresenceParticipant | null = participantId
    ? { participantId, name: '' }
    : null

  const { onlineIds } = usePresence(token, self)

  // Restore state on mount / reconnect
  useEffect(() => {
    if (!participantId) return
    fetch(`/api/games/${token}`).then(async (r) => {
      if (!r.ok) return
      const { game } = await r.json()
      // Check if there's an active round with a pending RoundPlay
      const activeRound = game.rounds?.[0]
      if (!activeRound || activeRound.status === 'waiting') return

      const inRound = activeRound.roundParticipants?.some(
        (rp: { participantId: string }) => rp.participantId === participantId
      )
      setIsInRound(!!inRound)
      setRoundPlayers(activeRound.roundParticipants?.map((rp: any) => ({
        id: rp.participantId,
        name: rp.participant?.name ?? '',
      })) ?? [])

      if (activeRound.status === 'active' && activeRound.roundPlays?.[0]) {
        const play = activeRound.roundPlays[0]
        setRoundPlayId(play.id)
        const yellowEndsAt = new Date(play.yellowEndsAt)
        const remaining = Math.max(0, yellowEndsAt.getTime() - Date.now())
        if (remaining > 0) {
          if (inRound) setButtonState('yellow')
          setTimeout(() => {
            if (inRound) { setButtonState('green'); setReactionStartTime(Date.now()) }
          }, remaining)
        } else {
          // Yellow phase already passed
          if (inRound) { setButtonState('green'); setReactionStartTime(Date.now()) }
        }
      }
    })
  }, [participantId, token])

  // Handle round_created broadcast
  useGameChannel(token, 'round_created', useCallback((payload: BroadcastRoundCreated) => {
    const players = payload.participants
    setRoundPlayers(players)
    const inRound = players.some((p) => p.id === participantId)
    setIsInRound(inRound)
    if (inRound) setButtonState('disabled')
    setRoundResult(null)
    setReactionTimeMs(null)
  }, [participantId]))

  // Handle round_start broadcast
  useGameChannel(token, 'round_start', useCallback((payload: BroadcastRoundStart) => {
    if (!isInRound) return
    setRoundPlayId(payload.roundPlayId)
    setButtonState('yellow')

    const yellowEndsAt = new Date(payload.yellowEndsAt)
    const remaining = calculateRemainingYellow(yellowEndsAt)

    setTimeout(() => {
      setButtonState('green')
      setReactionStartTime(Date.now())
    }, remaining)
  }, [isInRound]))

  // Handle round_result broadcast
  useGameChannel(token, 'round_result', useCallback((payload: BroadcastRoundResult) => {
    setRoundResult(payload)
    if (participantId) {
      const isWinner = payload.winners.includes(participantId)
      const myResult = payload.results.find((r) => r.participantId === participantId)
      if (myResult?.eliminated) setButtonState('red')
      else if (isWinner) setButtonState('winner')
      else setButtonState('loser')
    }
  }, [participantId]))

  // Handle round_stopped
  useGameChannel(token, 'round_stopped', () => {
    setButtonState('disabled')
    setIsInRound(false)
  })

  async function handleButtonPress() {
    if (!roundPlayId || !participantId) return

    if (buttonState === 'yellow') {
      setButtonState('red')
      await fetch(`/api/plays/${roundPlayId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, eliminated: true }),
      })
    } else if (buttonState === 'green' && reactionStartTime) {
      const ms = Date.now() - reactionStartTime
      setReactionTimeMs(ms)
      setButtonState('loser') // optimistic — server will correct to winner
      await fetch(`/api/plays/${roundPlayId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, reactionTimeMs: ms }),
      })
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 gap-6">
      {isInRound ? (
        <>
          <GameButton
            state={buttonState}
            reactionTimeMs={reactionTimeMs}
            onClick={handleButtonPress}
          />
          {roundResult && <RoundResult result={roundResult} />}
        </>
      ) : (
        <>
          <PanelSection title="Você é espectador" className="w-full max-w-sm">
            <p className="font-mono text-xs text-zinc-500 uppercase">
              Aguardando o admin iniciar uma rodada...
            </p>
          </PanelSection>
          {roundPlayers.length > 0 && (
            <SpectatorView players={roundPlayers} onlineIds={onlineIds} />
          )}
          {roundResult && <RoundResult result={roundResult} />}
        </>
      )}
    </main>
  )
}
```

- [ ] **Step 4: Wire up admin game page — full round lifecycle**

Update `src/app/admin/game/[id]/page.tsx` to manage state: `currentRoundId`, `currentPlayId`, `roundStatus`, `roundResult`.

Key flows — implement these exactly:

```
"Jogar" (first time, or after "Trocar Participantes"):
  → POST /api/games/${gameId}/rounds  { participantIds: selectedIds }
  → sets currentRoundId = round.id, roundStatus = 'waiting'
  → shows "Iniciar Jogada" button

"Iniciar Jogada":
  → POST /api/rounds/${currentRoundId}/plays
  → sets roundStatus = 'active', shows "Parar Rodada"

"Parar Rodada":
  → PATCH /api/rounds/${currentRoundId}/stop
  → sets roundStatus = 'stopped', clears currentRoundId

"Jogar Outra Vez" (shown after round_result):
  ⚠ MUST use existing currentRoundId — does NOT create a new Round
  → POST /api/rounds/${currentRoundId}/plays   ← same round, new play
  → sets roundStatus = 'active', clears roundResult

"Trocar Participantes" (shown after round_result):
  ⚠ Creates a NEW Round — allows changing selectedIds
  → clears currentRoundId, roundStatus = 'waiting'
  → user re-selects participants
  → "Jogar" creates a new Round
```

Use `useGameChannel` to subscribe to `round_result` and update `roundResult` state.
When `round_result` arrives: set `roundStatus = 'finished'`, show result + "Jogar Outra Vez" / "Trocar Participantes" buttons.

- [ ] **Step 5: Run all tests**

```bash
npm run test:run
```
Expected: all tests PASS.

- [ ] **Step 6: End-to-end manual test**

1. Open two browser windows
2. Admin creates game, shares token
3. Two participants join via token → enter name + avatar
4. Admin sees both participants online (green LEDs)
5. Admin selects both → clicks "Jogar" → "Iniciar Jogada"
6. Both participants see yellow button → transitions to green
7. One participant taps green → other participant taps green
8. Result shown to all: winner, reaction times
9. Admin clicks "Jogar Outra Vez"
10. Repeat flow

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete round engine — button states, result submission, broadcast"
```

---

## Verification

After all chunks are complete:

```bash
# Run all tests
npm run test:run

# Type check
npx tsc --noEmit

# Build for production
npm run build

# Deploy to Vercel (requires Vercel CLI or git push to main)
vercel --prod
```

**Manual test checklist:**
- [ ] Admin can log in and create a game
- [ ] Token appears on dashboard
- [ ] Participant can enter via home page with token
- [ ] Participant can choose name + avatar
- [ ] Admin sees participant online (green LED)
- [ ] Admin can select 2+ participants and start round
- [ ] Button transitions: disabled → yellow → green
- [ ] Pressing yellow → red (eliminated)
- [ ] Pressing green → sends reaction time
- [ ] Result broadcast to all: winner, times
- [ ] Spectator sees round in progress and result
- [ ] PWA installable on mobile (manifest.json)
- [ ] Dark/light mode works
