# Botão da Vez

> Quem aperta primeiro, fica com a vez.

Um jogo de reação em tempo real para famílias. O admin cria uma partida, os participantes entram com um código de 6 letras, e um grande botão muda de cinza → amarelo → verde. Quem apertar no verde mais rápido ganha a vez.

---

## Como funciona

1. **Admin** faz login, cria um jogo e compartilha o código de 6 letras
2. **Participantes** acessam a página inicial, digitam o código, escolhem nome e avatar
3. **Admin** seleciona 2 ou mais participantes online e inicia a rodada
4. O botão fica **amarelo** (atenção!) por um tempo aleatório entre 1,5 e 3,5 segundos
5. O botão fica **verde** — quem apertar primeiro ganha
6. Apertar no amarelo = eliminado (botão fica vermelho)
7. O resultado é exibido para todos em tempo real: vencedor, tempos de reação e ranking
8. Admin pode jogar outra vez (mesmos participantes) ou trocar participantes

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript (strict) |
| Estilo | TailwindCSS v4 |
| Banco de dados | PostgreSQL via Supabase |
| ORM | Prisma 5 |
| Tempo real | Supabase Realtime (Broadcast + Presence) |
| Autenticação | Supabase Auth (somente admin) |
| Testes | Vitest 2 |
| PWA | @ducanh2912/next-pwa |
| Deploy | Vercel (Hobby gratuito) |

---

## Pré-requisitos

- Node.js 20+
- Conta no [Supabase](https://supabase.com) (gratuito)
- Conta na [Vercel](https://vercel.com) para deploy (opcional)

---

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```env
# Supabase — Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Banco de dados — Dashboard → Settings → Database → Connection string
# Use a URL com pgbouncer (porta 6543) para DATABASE_URL
DATABASE_URL="postgresql://postgres.xxx:[senha]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
# Use a URL direta (porta 5432) para DIRECT_URL (necessária para migrations)
DIRECT_URL="postgresql://postgres.xxx:[senha]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

Crie também um arquivo `.env` (necessário para o Prisma rodar migrations):

```env
DATABASE_URL="postgresql://postgres.xxx:[senha]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:[senha]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

### 3. Criar as tabelas no banco

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Criar o usuário admin

No painel do Supabase → **Authentication → Users → Add user**, crie um usuário com e-mail e senha. Esse será o login do admin do jogo.

### 5. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Scripts disponíveis

```bash
npm run dev        # Servidor de desenvolvimento
npm run build      # Build de produção
npm run start      # Servidor de produção
npm run test       # Testes em modo watch
npm run test:run   # Testes (execução única, para CI)
npm run lint       # Linting
```

---

## Estrutura do projeto

```
src/
├── app/
│   ├── page.tsx                        # Página inicial — entrada por token
│   ├── play/[token]/page.tsx           # Entrada do participante (nome + avatar)
│   ├── game/[token]/page.tsx           # Tela do jogo (botão ou espectador)
│   ├── admin/
│   │   ├── page.tsx                    # Login do admin
│   │   ├── dashboard/page.tsx          # Lista de jogos criados
│   │   └── game/[id]/page.tsx          # Controle da partida
│   └── api/
│       ├── auth/login/                 # POST login
│       ├── auth/logout/                # POST logout
│       ├── games/                      # GET/POST jogos
│       ├── games/[token]/              # GET validar token (público)
│       ├── games/[id]/participants/    # POST entrar no jogo
│       ├── games/[id]/rounds/          # POST criar rodada
│       ├── rounds/[id]/plays/          # POST iniciar jogada
│       ├── rounds/[id]/stop/           # PATCH parar rodada
│       ├── plays/[id]/results/         # POST enviar resultado
│       └── admin/games/[id]/          # GET dados da partida (admin)
├── components/
│   ├── ui/                             # Design system (botões, LEDs, painéis)
│   ├── game/                           # GameButton, RoundResult, SpectatorView
│   └── admin/                          # ParticipantList
├── hooks/
│   ├── use-game-channel.ts             # Eventos Realtime (Broadcast)
│   ├── use-presence.ts                 # Presença online (Presence)
│   └── use-participant.ts              # Identidade no localStorage
├── lib/
│   ├── game-logic.ts                   # calculateRoundResult() — lógica pura
│   ├── token.ts                        # generateToken() — lógica pura
│   ├── timing.ts                       # Temporização do botão amarelo
│   ├── round.ts                        # Validação de transições de estado
│   ├── finalize-round.ts               # Finalização atômica da rodada
│   ├── prisma.ts                       # Singleton do Prisma
│   └── supabase/                       # Clientes Supabase (browser, server, realtime)
└── types/index.ts                      # Tipos TypeScript compartilhados
```

---

## Arquitetura de tempo real

Toda a comunicação em tempo real usa um canal Supabase por partida: `game:{TOKEN}`.

| Evento | Direção | Payload |
|---|---|---|
| `round_created` | Servidor → Clientes | Lista de participantes da rodada |
| `round_start` | Servidor → Clientes | `yellowDurationMs`, `yellowEndsAt` (timestamp absoluto) |
| `round_result` | Servidor → Clientes | Tipo (winner/tie/no_winner), vencedores, tempos e rankings |
| `round_stopped` | Servidor → Clientes | ID da rodada parada |
| Presence | Clientes → Canal | `participantId`, `name` (quem está online) |

O `yellowEndsAt` é um timestamp absoluto gerado no servidor — isso garante que todos os dispositivos façam a transição amarelo→verde no mesmo instante, independente de diferenças de relógio entre os aparelhos.

---

## Modelo de dados

```
Administrator ─┐
               └── Game ──── Participant ──── Team
                         └── Round ─────────── RoundParticipant
                                    └── RoundPlay ── RoundPlayResult
```

- **Round** = configuração da disputa (quais participantes, status)
- **RoundPlay** = uma tentativa dentro da rodada (pode jogar várias vezes com os mesmos participantes)
- **"Jogar Outra Vez"** cria um novo `RoundPlay` no mesmo `Round`
- **"Trocar Participantes"** cria um novo `Round`

---

## Testes

```bash
npm run test:run
```

23 testes unitários cobrindo a lógica de negócio pura:

- `token.test.ts` — geração de tokens únicos
- `game-logic.test.ts` — cálculo de vencedor, empate, eliminados e rankings
- `timing.test.ts` — duração aleatória e sincronização de relógio
- `round.test.ts` — validação de transições de estado da rodada

---

## Deploy na Vercel

1. Faça push do repositório para o GitHub
2. Importe o projeto na [Vercel](https://vercel.com/new)
3. Adicione as variáveis de ambiente (as mesmas do `.env.local`)
4. A Vercel detecta o Next.js automaticamente e faz o build

> O app foi projetado para rodar no plano **Hobby gratuito** da Vercel (sem servidor customizado, tudo serverless).

---

## Design

Interface inspirada no visual do **Teenage Engineering K.O. II** — estética escuromórfica com botões com relevo, LEDs com brilho, displays de 7 segmentos e paleta de cores laranja/cinza/verde. Suporta modo claro e escuro (segue preferência do sistema).
