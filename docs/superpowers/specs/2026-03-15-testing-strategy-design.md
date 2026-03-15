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

---

## 2. Arquitetura da Suite

Duas camadas, ambas rodando com Vitest:

### Camada 1 — Unit tests (expandir existente)

**Local**: `src/lib/__tests__/`

Lógica pura sem I/O. Sem mocks necessários.

Módulos a adicionar/expandir:

| Arquivo | Módulo testado | Justificativa |
|---|---|---|
| `finalize-round.test.ts` | `finalize-round.ts` | Orquestra coleta + timeout — módulo mais crítico sem cobertura |
| `timing.test.ts` (ampliar) | `timing.ts` | Edge cases de reconexão e boundary conditions |

### Camada 2 — API route tests (novo)

**Local**: `src/app/api/__tests__/`

Testa route handlers do Next.js chamando-os diretamente como funções (sem HTTP real). Prisma e Supabase são mockados via `vi.mock()`.

Rotas cobertas:

| Arquivo | Rota | Criticidade |
|---|---|---|
| `rounds-plays.test.ts` | `POST /api/rounds/[id]/plays` | Alta — inicia a jogada, sorteia timing, faz broadcast |
| `plays-results.test.ts` | `POST /api/plays/[id]/results` | Alta — coleta resultados, aciona finalização |
| `rounds-stop.test.ts` | `PATCH /api/rounds/[id]/stop` | Média — parada manual de rodada |

---

## 3. Estratégia de Mocks

### Mock do Prisma

```ts
// src/test/mocks/prisma.ts
import { vi } from 'vitest'

export const prismaMock = {
  roundPlay: { create: vi.fn(), findUnique: vi.fn() },
  roundPlayResult: { create: vi.fn(), count: vi.fn() },
  round: { update: vi.fn(), findUnique: vi.fn() },
}

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
```

Cada teste configura retornos via `.mockResolvedValue()`. `beforeEach` limpa com `vi.clearAllMocks()`.

### Mock do Supabase (server client)

```ts
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } } }),
    },
    channel: vi.fn(() => ({
      send: vi.fn().mockResolvedValue({ status: 'ok' }),
    })),
  })),
}))
```

`finalize-round.ts` **não** usa mocks nos unit tests — é testado como função pura recebendo dados já buscados.

---

## 4. Casos de Teste

### `finalize-round.test.ts`

| Caso | Comportamento esperado |
|---|---|
| Todos resultados recebidos | Finaliza rodada, calcula vencedor, faz broadcast `round_result` |
| Resultados incompletos | Não finaliza (aguarda) |
| Timeout expirado com ausentes | Trata ausentes como `null` (timeout), finaliza |
| Rodada já `finished` | Não finaliza de novo (idempotência) |
| Rodada já `stopped` | Não processa resultado |

### `rounds-plays.test.ts` — `POST /api/rounds/[id]/plays`

| Caso | Comportamento esperado |
|---|---|
| Happy path | Cria RoundPlay, `yellowDurationMs` entre 1500–3500ms, `yellowEndsAt` no futuro |
| Broadcast correto | `round_start` enviado com `{ roundPlayId, yellowDurationMs, yellowEndsAt }` |
| Round não existe | 404 |
| Admin não é dono do game | 403 |
| Round já está `active` | 409 |

### `plays-results.test.ts` — `POST /api/plays/[id]/results`

| Caso | Comportamento esperado |
|---|---|
| Happy path | Persiste resultado, aciona finalização se todos chegaram |
| Resultado eliminado | Aceita `reactionTimeMs: null` com `eliminated: true` |
| Último resultado | Aciona finalização e broadcast `round_result` |
| Resultado duplicado | 409 (mesmo participante, mesmo roundPlay) |
| RoundPlay não existe | 404 |

### `rounds-stop.test.ts` — `PATCH /api/rounds/[id]/stop`

| Caso | Comportamento esperado |
|---|---|
| Happy path | Atualiza `Round.status` para `stopped`, broadcast `round_stopped` |
| Round não está `active` | 409 |
| Admin não é dono | 403 |

### `timing.test.ts` (ampliar)

| Caso | Comportamento esperado |
|---|---|
| `yellowEndsAt` = agora (boundary) | `calculateRemainingYellow` retorna 0, não negativo |
| Reconexão com `yellowEndsAt` 500ms no passado | Retorna 0 (não lança erro) |

---

## 5. Estrutura de Arquivos

```
src/
  test/
    mocks/
      prisma.ts          ← mock compartilhado do Prisma
      supabase.ts        ← mock compartilhado do Supabase server client
    setup.ts             ← já existe
  lib/
    __tests__/
      game-logic.test.ts ← já existe
      round.test.ts      ← já existe
      timing.test.ts     ← já existe (ampliar)
      token.test.ts      ← já existe
      finalize-round.test.ts  ← NOVO
  app/
    api/
      __tests__/
        rounds-plays.test.ts   ← NOVO
        plays-results.test.ts  ← NOVO
        rounds-stop.test.ts    ← NOVO
```

---

## 6. O que esta suite NÃO cobre (aceito)

- **Sincronização real de Realtime** (Supabase Broadcast/Presence): requer projeto Supabase ativo — fora do constraint de infraestrutura mínima. O timing math é coberto nos unit tests; a entrega de WebSocket não é.
- **Testes de UI/componentes**: fora do escopo do MVP conforme spec original.
- **Rotas menos críticas** (`/api/auth/*`, `/api/games`, `/api/games/[id]/participants`): sem lógica de negócio complexa, baixo risco.
