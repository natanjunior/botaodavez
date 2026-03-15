# Testing Strategy — Botão da Vez

**Data**: 2026-03-15
**Status**: Aprovado

---

## 1. Contexto

O projeto já possui 4 arquivos de unit tests cobrindo lógica de negócio pura (`game-logic`, `round`, `timing`, `token`) com Vitest. Esta spec define a expansão da suite para cobrir os módulos críticos restantes e adicionar testes de API routes.

**Objetivo**: aumentar confiabilidade para uso familiar sem adicionar infraestrutura externa. Tudo roda com `npm test`.

**Constraints**:
- Sem serviços externos (sem Supabase real, sem banco de teste)
- Sem CI/CD novo por enquanto
- Vitest como único runner
- `vitest-mock-extended` **não** é usado — mocks hand-rolled com `vi.fn()` são suficientes para o escopo

---

## 2. Arquitetura da Suite

Duas camadas, ambas rodando com Vitest:

### Camada 1 — Unit tests (ampliar existente)

**Local**: `src/lib/__tests__/`

Lógica pura sem I/O. Sem mocks necessários.

Módulos a ampliar:

| Arquivo | Módulo testado | O que adicionar |
|---|---|---|
| `timing.test.ts` | `timing.ts` | Edge case de boundary: `yellowEndsAt` = agora exato retorna 0 (não negativo) |

> Nota: o caso "past date returns 0" já está coberto no `timing.test.ts` existente (linhas 32–35) e **não** deve ser duplicado.

### Camada 2 — Testes com mocks (novo)

**Local**: `src/lib/__tests__/` para `finalize-round.test.ts`; `src/app/api/__tests__/` para os route handlers.

Prisma e Supabase são mockados via `vi.mock()`. Todos os arquivos de teste importam os mocks compartilhados de `src/test/mocks/`.

Módulos cobertos:

| Arquivo | O que testa | Mocks necessários |
|---|---|---|
| `finalize-round.test.ts` | `src/lib/finalize-round.ts` | Prisma + Supabase `createServiceClient` |
| `rounds-plays.test.ts` | `POST /api/rounds/[id]/plays` | Prisma + Supabase (`createClient` + `createServiceClient`) + `next/server after` |
| `plays-results.test.ts` | `POST /api/plays/[id]/results` | Prisma (`$transaction`) + `finalizeRound` |
| `rounds-stop.test.ts` | `PATCH /api/rounds/[id]/stop` | Prisma + Supabase (`createClient` + `createServiceClient`) |

---

## 3. Estratégia de Mocks

### Regra fundamental — factories auto-contidas

O Vitest hoista `vi.mock()` sintaticamente para antes dos `import` statements. Por isso, qualquer referência a um símbolo importado dentro de uma factory closure estará `undefined` quando a factory executar.

**Regra**: o objeto passado à factory de `vi.mock()` deve ser auto-contido — sem referenciar nenhuma variável importada. Para obter referências para configurar retornos nos testes, importe o próprio módulo mockado após o registro:

```ts
// ✅ Correto — factory auto-contida
vi.mock('@/lib/prisma', () => ({
  prisma: {
    round: { findUnique: vi.fn(), update: vi.fn() },
    // ...
  },
}))

// Depois dos mocks registrados, importar o módulo mockado para acessar as funções:
import { prisma } from '@/lib/prisma'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.$transaction).mockImplementation((fn) => fn(prisma))
})

it('caso de teste', async () => {
  vi.mocked(prisma.round.findUnique).mockResolvedValue({ id: 'r1', status: 'waiting', ... })
  // ...
})
```

### Mock do Prisma — padrão por test file

Cada test file que usa Prisma inclui esta factory auto-contida no topo:

```ts
vi.mock('@/lib/prisma', () => ({
  prisma: {
    roundPlay: {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    roundPlayResult: {
      create: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    round: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    participant: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))
```

E depois dos imports:
```ts
import { prisma } from '@/lib/prisma'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.$transaction).mockImplementation((fn) => fn(prisma))
})
```

### Mock do Supabase — padrão por test file

Cada test file que usa Supabase inclui esta factory auto-contida:

```ts
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))
```

E depois dos imports, configura defaults no `beforeEach`:
```ts
import { createClient, createServiceClient } from '@/lib/supabase/server'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }),
    },
  } as never)
  vi.mocked(createServiceClient).mockResolvedValue({
    channel: vi.fn(() => ({
      send: vi.fn().mockResolvedValue({ status: 'ok' }),
    })),
  } as never)
})
```

Testes que precisam de auth inválida sobrescrevem no próprio teste:
```ts
it('retorna 401 se não autenticado', async () => {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  } as never)
  // ...
})
```

### Arquivos de fixtures — `src/test/fixtures/`

Os arquivos em `src/test/mocks/` são descartados (não há exportações de `vi.fn()` compartilhados). Em vez disso, pode-se criar `src/test/fixtures/` com funções que retornam dados de teste tipados (ex: `makeRound()`, `makeRoundPlay()`). Isso é opcional e pode ser adicionado durante a implementação conforme a necessidade.

### Mock de `next/server after` — inline em `rounds-plays.test.ts`

`after()` agenda execução deferred; nos testes o comportamento assíncrono pós-resposta não é exercitado. É mockado como no-op:

```ts
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return { ...actual, after: vi.fn() }
})
```

Os testes para o caminho de timeout (participantes ausentes) são cobertos em `finalize-round.test.ts`, onde a lógica de finalização é testada diretamente.

### Mock de `finalizeRound` em `plays-results.test.ts`

`finalizeRound` tem suas próprias deps (Prisma + Supabase). No contexto dos testes de API route, é mockado para isolar o route handler:

```ts
vi.mock('@/lib/finalize-round', () => ({
  finalizeRound: vi.fn().mockResolvedValue(undefined),
}))
```

Os testes verificam que `finalizeRound` foi chamado com os args corretos — o comportamento interno já é coberto em `finalize-round.test.ts`.

### Construção de NextRequest e params

Route handlers do Next.js 15 App Router recebem `params` como `Promise<{ id: string }>`. Padrão de invocação:

```ts
import { NextRequest } from 'next/server'

function makeRequest(body?: unknown) {
  return new NextRequest('http://localhost/api/test', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'content-type': 'application/json' },
  })
}

const params = Promise.resolve({ id: 'round-id-123' })

// Chamada do handler:
const res = await POST(makeRequest({ participantId: 'p1', reactionTimeMs: 300 }), { params })
```

---

## 4. Casos de Teste

### `finalize-round.test.ts` — `src/lib/finalize-round.ts`

| Caso | Setup | Comportamento esperado |
|---|---|---|
| Finaliza quando todos chegaram | `roundPlay.updateMany` retorna `{ count: 1 }` | Chama `round.update status=finished`, broadcast `round_result` |
| Race condition — já finalizado | `roundPlay.updateMany` retorna `{ count: 0 }` | Retorna imediatamente sem chamar `round.update` ou broadcast |
| Calcula vencedor corretamente | Results com `reactionTimeMs` diferentes | Broadcast payload contém `type: 'winner'`, `winners` com menor tempo |
| Todos eliminados | Results com `eliminated: true` | Broadcast payload contém `type: 'no_winner'` |
| Empate | Results com mesmo `reactionTimeMs` | Broadcast payload contém `type: 'tie'`, `winners` com ambos |

### `rounds-plays.test.ts` — `POST /api/rounds/[id]/plays`

| Caso | Setup | Comportamento esperado |
|---|---|---|
| Happy path | Round `waiting`, admin dono | 200, `yellowDurationMs` entre 1500–3500ms, `yellowEndsAt` no futuro |
| Broadcast correto | Happy path | `channel.send` chamado com `event: 'round_start'`, payload com `{ roundPlayId, yellowDurationMs, yellowEndsAt }` |
| Não autenticado | `getUser` retorna `user: null` | 401 |
| Round não existe | `round.findUnique` retorna `null` | 404 |
| Admin não é dono | `round.game.adminId !== user.id` | 403 |
| Round já `active` | Round status `active` | 409 (transição inválida) |
| Round `stopped` | Round status `stopped` | 409 (transição inválida) |

### `plays-results.test.ts` — `POST /api/plays/[id]/results`

> Nota sobre idempotência: resultado duplicado (mesmo `participantId`) retorna `{ ok: true }` com **200**, não 409. `ALREADY_DONE` (`finishedAt` set) também retorna `{ ok: true }` com 200. Não há 409 nessa rota.

| Caso | Setup | Comportamento esperado |
|---|---|---|
| Happy path — não é o último | `results.length + 1 < expected` | 200, `finalizeRound` **não** chamado |
| Happy path — é o último | `results.length + 1 >= expected` | 200, `finalizeRound` chamado com args corretos |
| Resultado eliminado | Body com `eliminated: true` | 200, `roundPlayResult.create` chamado com `reactionTimeMs: null`, `eliminated: true` |
| Resultado duplicado (idempotente) | `results` já inclui `participantId` | 200, `roundPlayResult.create` **não** chamado novamente |
| RoundPlay já finalizado (`finishedAt` set) | `roundPlay.finishedAt` não-null | 200 imediato, sem criar resultado |
| RoundPlay não existe | `roundPlay.findUnique` retorna `null` | 404 |

### `rounds-stop.test.ts` — `PATCH /api/rounds/[id]/stop`

> Nota: o handler de stop **não** verifica o status atual da rodada — para qualquer rodada autenticada e válida. Não há 409 nessa rota.

| Caso | Setup | Comportamento esperado |
|---|---|---|
| Happy path | Round existente, admin dono | 200, `round.update status=stopped`, broadcast `round_stopped` |
| Broadcast correto | Happy path | `channel.send` chamado com `event: 'round_stopped'`, payload com `{ roundId }` |
| Não autenticado | `getUser` retorna `user: null` | 401 |
| Round não existe | `round.findUnique` retorna `null` | 404 |
| Admin não é dono | `round.game.adminId !== user.id` | 403 |

### `timing.test.ts` — ampliar

| Caso | Comportamento esperado |
|---|---|
| `yellowEndsAt` = `new Date(Date.now())` (boundary exato) | `calculateRemainingYellow` retorna 0, nunca negativo |

---

## 5. Estrutura de Arquivos

```
src/
  test/
    fixtures/            ← opcional: funções que retornam dados de teste tipados (ex: makeRound())
    setup.ts             ← já existe
  lib/
    __tests__/
      game-logic.test.ts    ← já existe
      round.test.ts         ← já existe
      timing.test.ts        ← já existe (adicionar 1 caso boundary)
      token.test.ts         ← já existe
      finalize-round.test.ts ← NOVO (Camada 2 — usa mocks)
  app/
    api/
      __tests__/
        rounds-plays.test.ts   ← NOVO
        plays-results.test.ts  ← NOVO
        rounds-stop.test.ts    ← NOVO
```

---

## 6. O que esta suite NÃO cobre (aceito)

- **Sincronização real de Realtime** (Supabase Broadcast/Presence): requer projeto Supabase ativo — fora do constraint de infraestrutura mínima. A lógica matemática do timing é coberta nos unit tests; a entrega de WebSocket não é.
- **Testes de UI/componentes**: fora do escopo do MVP conforme spec original.
- **Rotas menos críticas** (`/api/auth/*`, `/api/games`, `/api/games/[id]/participants`): sem lógica de negócio complexa, baixo risco.
- **Caminho do `after()` timeout** (participantes que não enviaram resultado): a lógica de finalização com ausentes é coberta em `finalize-round.test.ts`; o agendamento via `after()` é mockado como no-op nos testes de route.
