# Quick Start v2: Botão da Vez - Próximos Passos

**Feature**: 001-button-game
**Data**: 2025-12-27
**Para**: Desenvolvedores implementando a feature

---

## O Que Já Está Configurado ✅

Você já seguiu a documentação oficial ([Tailwind + Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs) e [Supabase template](https://vercel.com/templates/authentication/supabase)) e configurou:

- ✅ **Next.js 16.1.1** com App Router
- ✅ **React 19.2.3**
- ✅ **Tailwind CSS 4.1.18** (configuração completa skeuomorphic)
- ✅ **TypeScript 5** com tipos do projeto ([src/types/game.ts](../../src/types/game.ts))
- ✅ **Socket.io 4.8.3** (cliente e servidor)
- ✅ **next-pwa 5.6.0**
- ✅ **Font Awesome** (@fortawesome/react-fontawesome + free-solid-svg-icons)
- ✅ **.env.local** com chaves Supabase públicas

**Arquivos de Configuração Existentes**:
- `package.json` - Scripts e dependências
- `next.config.ts` - Configuração Next.js (precisa ajuste para PWA)
- `tsconfig.json` - TypeScript configurado
- `tailwind.config.ts` - **Completo** com tema skeuomorphic (cores retro, shadows, fonts)
- `.env.local` - Supabase URL e chave pública
- `src/app/layout.tsx` - Layout raiz
- `src/app/page.tsx` - Página inicial (placeholder)
- `src/app/globals.css` - Estilos globais com Tailwind 4

---

## O Que Falta Fazer ❌

Este guia cobre **apenas o que ainda não foi configurado**. Não repete o que você já fez.

---

## 1. Instalar Dependências Supabase

As únicas dependências que faltam são os pacotes Supabase:

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

**Versões esperadas**:
- `@supabase/supabase-js`: ^2.x
- `@supabase/auth-helpers-nextjs`: latest

**Verificar instalação**:
```bash
npm list @supabase/supabase-js @supabase/auth-helpers-nextjs
```

---

## 2. Ajustar Configurações Existentes

### 2.1 Atualizar next.config.ts

**Arquivo**: `next.config.ts`

**Substituir conteúdo por**:

```typescript
import withPWA from 'next-pwa';

const nextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: true,
  },
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
```

**Por que**:
- Integra next-pwa (já instalado) para Progressive Web App
- Habilita Server Actions (para formulários e mutations)
- PWA desabilitado em dev (para facilitar debugging)

---

### 2.2 Ajustar tsconfig.json (opcional)

**Arquivo**: `tsconfig.json`

Mudanças sugeridas para melhor compatibilidade com Next.js App Router:

```json
{
  "compilerOptions": {
    "target": "ES2020",  // Alterar de ES2017
    "jsx": "preserve",   // Alterar de "react-jsx"
    // ... resto mantém igual
  }
}
```

**Por que**:
- `ES2020`: Suporta features modernas (opcional chaining, nullish coalescing)
- `jsx: "preserve"`: Next.js compila JSX, não precisa do TypeScript compilar

**Nota**: Estas mudanças são opcionais. O projeto funciona com as configurações atuais.

---

### 2.3 Adicionar SUPABASE_SERVICE_ROLE_KEY ao .env.local

**Arquivo**: `.env.local`

**Adicionar linha**:

```bash
# Já existe:
NEXT_PUBLIC_SUPABASE_URL=https://mkofxzwsoytsxixljpwc.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_kpqU92Oy6bSMW54Ol7t_YA_qdk7x9La

# ADICIONAR:
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-aqui
```

**Como obter a chave**:
1. Ir para [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecionar projeto `mkofxzwsoytsxixljpwc`
3. Settings → API
4. Copiar **service_role** (⚠️ SECRET - nunca commitar!)

**Por que é necessária**:
- Cliente admin (server-side) precisa dela para operações privilegiadas
- Exemplo: Criar games, gerenciar participantes, acessar dados de todos os games

---

## 3. Criar Estrutura de Diretórios

Execute no terminal **PowerShell**:

```powershell
# App routes (admin + participant)
New-Item -ItemType Directory -Force -Path "src\app\(admin)\dashboard"
New-Item -ItemType Directory -Force -Path "src\app\(admin)\game\[token]"
New-Item -ItemType Directory -Force -Path "src\app\(admin)\login"
New-Item -ItemType Directory -Force -Path "src\app\(participant)\join"
New-Item -ItemType Directory -Force -Path "src\app\(participant)\play\[token]"

# API routes
New-Item -ItemType Directory -Force -Path "src\app\api\auth"
New-Item -ItemType Directory -Force -Path "src\app\api\games"
New-Item -ItemType Directory -Force -Path "src\app\api\participants"
New-Item -ItemType Directory -Force -Path "src\app\api\rounds"
New-Item -ItemType Directory -Force -Path "src\app\api\teams"
New-Item -ItemType Directory -Force -Path "src\app\api\socket"

# Components
New-Item -ItemType Directory -Force -Path "src\components\admin"
New-Item -ItemType Directory -Force -Path "src\components\participant"
New-Item -ItemType Directory -Force -Path "src\components\shared"
New-Item -ItemType Directory -Force -Path "src\components\ui"

# Lib (business logic)
New-Item -ItemType Directory -Force -Path "src\lib\services"
New-Item -ItemType Directory -Force -Path "src\lib\socket\handlers"
New-Item -ItemType Directory -Force -Path "src\lib\db"
New-Item -ItemType Directory -Force -Path "src\lib\utils"

# Supabase migrations
New-Item -ItemType Directory -Force -Path "supabase\migrations"

# PWA assets
New-Item -ItemType Directory -Force -Path "public\icons"
```

**Estrutura final esperada**:

```
src/
├── app/
│   ├── (admin)/               # 🆕 Admin routes (protected)
│   │   ├── dashboard/
│   │   ├── game/[token]/
│   │   └── login/
│   ├── (participant)/         # 🆕 Participant routes (public)
│   │   ├── join/
│   │   └── play/[token]/
│   ├── api/                   # 🆕 REST API endpoints
│   │   ├── auth/
│   │   ├── games/
│   │   ├── participants/
│   │   ├── rounds/
│   │   ├── teams/
│   │   └── socket/
│   ├── layout.tsx             # ✅ Já existe
│   ├── page.tsx               # ✅ Já existe
│   └── globals.css            # ✅ Já existe
├── components/                # 🆕 React components
│   ├── admin/
│   ├── participant/
│   ├── shared/
│   └── ui/
├── lib/                       # 🆕 Backend logic
│   ├── services/
│   ├── socket/handlers/
│   ├── db/
│   └── utils/
└── types/
    └── game.ts                # ✅ Já existe

supabase/                      # 🆕 Database migrations
  └── migrations/

public/
  └── icons/                   # 🆕 PWA icons
```

---

## 4. Implementar Cliente Supabase

**Arquivo**: `src/lib/db/supabase.ts` (criar)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

// Cliente público (frontend + backend)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente admin (server-side only)
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRole!,
  { auth: { persistSession: false } }
);
```

**Uso**:
- `supabase` - Usa `PUBLISHABLE_DEFAULT_KEY` (Row-Level Security aplicado)
- `supabaseAdmin` - Usa `SERVICE_ROLE_KEY` (bypassa RLS, server-only)

**Exemplo de uso** (client component):
```typescript
import { supabase } from '@/lib/db/supabase';

const { data: games } = await supabase.from('games').select('*');
```

---

## 5. Configurar Socket.io Server

**Arquivo**: `src/app/api/socket/route.ts` (criar)

```typescript
import { NextRequest } from 'next/server';
import { Server } from 'socket.io';

let io: Server;

export async function GET(req: NextRequest) {
  if (!io) {
    // Inicializa Socket.io server
    const httpServer = (req as any).socket.server;
    io = new Server(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
    });

    io.on('connection', (socket) => {
      const { game_token, participant_id, role } = socket.handshake.query;

      // Entrar na room do game
      socket.join(game_token as string);

      console.log(`${role} conectado ao game ${game_token}`);

      // Eventos do participante
      socket.on('participant:heartbeat', (data) => {
        // TODO: Atualizar last_seen no banco
      });

      socket.on('round:button-click', (data) => {
        // TODO: Registrar clique e determinar vencedor
      });

      socket.on('round:eliminate', (data) => {
        // TODO: Marcar participante como eliminado
      });

      socket.on('disconnect', () => {
        // TODO: Marcar participante como offline
        console.log(`${role} desconectado do game ${game_token}`);
      });
    });
  }

  return new Response('Socket.io server running', { status: 200 });
}
```

**Como testar** (após implementar):
1. Dev server rodando: `npm run dev`
2. Abrir console do navegador:
```javascript
const socket = io({ path: '/api/socket', query: { game_token: 'TEST123', role: 'participant' } });
socket.on('connect', () => console.log('Conectado!'));
```

**Próximos passos**: Implementar handlers em `src/lib/socket/handlers/` conforme [contracts/websocket-events.md](./contracts/websocket-events.md)

---

## 6. Criar Migração do Banco de Dados

### 6.1 Instalar Supabase CLI

```bash
npm install -g supabase
```

**Verificar instalação**:
```bash
supabase --version
```

---

### 6.2 Linkar Projeto Supabase

```bash
# Login (abre browser para autenticação)
supabase login

# Linkar ao projeto existente
supabase link --project-ref mkofxzwsoytsxixljpwc
```

**Confirmação**: Deve exibir "Linked to project mkofxzwsoytsxixljpwc"

---

### 6.3 Criar Arquivo de Migração

**Arquivo**: `supabase/migrations/001_initial_schema.sql` (criar)

**Copiar conteúdo** da seção **"Database Schema (SQL)"** do arquivo [data-model.md](./data-model.md#database-schema-sql).

O SQL completo inclui:
- Tabelas: `admins`, `games`, `teams`, `participants`, `rounds`, `round_participants`, `round_results`
- Índices para performance
- Constraints de validação
- Foreign keys com CASCADE

---

### 6.4 Aplicar Migração

```bash
supabase db push
```

**Verificar no dashboard Supabase**:
1. Dashboard → Table Editor
2. Deve mostrar 7 tabelas criadas

**Alternativa (executar SQL diretamente)**:
1. Dashboard → SQL Editor
2. Colar SQL da migração
3. Run

---

## 7. Configurar PWA

### 7.1 Criar Manifest

**Arquivo**: `public/manifest.json` (criar)

```json
{
  "name": "Botão da Vez",
  "short_name": "Botão",
  "description": "Jogo de reação para família e amigos",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#3E2723",
  "theme_color": "#D4AF37",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

**Cores**:
- `background_color`: Marrom escuro (fundo splash screen)
- `theme_color`: Dourado (barra de navegação mobile)

---

### 7.2 Gerar Ícones PWA

**Opção 1 - Online** (recomendado):
1. Acesse https://realfavicongenerator.net/
2. Upload uma logo quadrada (mínimo 512x512px)
3. Configurar:
   - Android: Tema dourado (#D4AF37)
   - iOS: Background marrom (#3E2723)
4. Download e extrair em `public/icons/`

**Opção 2 - Manual**:
- Criar 2 imagens PNG:
  - `icon-192.png` (192x192px)
  - `icon-512.png` (512x512px)
- Colocar em `public/icons/`
- Usar fundo marrom (#3E2723) e elemento dourado (#D4AF37)

---

### 7.3 Linkar Manifest no Layout

**Arquivo**: `src/app/layout.tsx`

**Adicionar dentro de `<head>`**:

```typescript
export const metadata: Metadata = {
  title: "Botão da Vez",
  description: "Jogo de reação para família e amigos",
  manifest: "/manifest.json", // 🆕 Adicionar esta linha
};
```

**Ou usar arquivo de metadados separado** (Next.js 14+):

Criar `src/app/metadata.ts`:
```typescript
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Botão da Vez",
  description: "Jogo de reação para família e amigos",
  manifest: "/manifest.json",
  themeColor: "#D4AF37",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Botão",
  },
};
```

---

## 8. Verificar Instalação

### Checklist de Configuração

- [ ] **Dependências Supabase instaladas** (verificar `package.json`)
- [ ] **next.config.ts atualizado** com wrapper PWA
- [ ] **tsconfig.json ajustado** (opcional: ES2020 + jsx preserve)
- [ ] **.env.local tem SUPABASE_SERVICE_ROLE_KEY**
- [ ] **Estrutura de diretórios criada** (verificar `src/app/`, `src/lib/`)
- [ ] **Cliente Supabase implementado** (`src/lib/db/supabase.ts`)
- [ ] **Socket.io server implementado** (`src/app/api/socket/route.ts`)
- [ ] **Migração do banco executada** (verificar dashboard Supabase)
- [ ] **Manifest PWA criado** (`public/manifest.json`)
- [ ] **Ícones PWA gerados** (`public/icons/icon-*.png`)

---

### Testar Dev Server

```bash
npm run dev
```

**Verificações**:

1. **Build sem erros**:
   - Terminal não deve mostrar erros de TypeScript
   - Compilação deve completar com sucesso

2. **Abrir http://localhost:3000**:
   - Página inicial carrega (placeholder atual)
   - Console do navegador sem erros

3. **Verificar PWA** (Chrome DevTools):
   - Application → Manifest
   - Deve mostrar "Botão da Vez" com ícones

4. **Verificar Supabase**:
   ```typescript
   // Console do navegador:
   import { supabase } from '@/lib/db/supabase';
   const { data } = await supabase.from('games').select('count');
   console.log(data); // Deve retornar sem erro (array vazio ok)
   ```

5. **Verificar Socket.io**:
   - Acessar http://localhost:3000/api/socket
   - Deve mostrar "Socket.io server running"

---

## 9. Próximos Passos - Implementação

Com a configuração completa, você pode começar a implementar as **User Stories** na ordem de prioridade:

### User Story 1 (P1): Criar e Configurar Game

**Páginas a criar**:
- `src/app/(admin)/login/page.tsx` - Login do administrador
- `src/app/(admin)/dashboard/page.tsx` - Dashboard com lista de games
- `src/app/(admin)/game/[token]/page.tsx` - Tela de gerenciamento do game
- `src/app/(participant)/join/page.tsx` - Tela para entrar em game via token
- `src/app/(participant)/play/[token]/page.tsx` - Tela do participante

**Componentes a criar**:
- `src/components/admin/GameDashboard.tsx` - Dashboard do game
- `src/components/admin/ParticipantList.tsx` - Lista de participantes
- `src/components/admin/TeamManager.tsx` - Gerenciamento de equipes
- `src/components/shared/Avatar.tsx` - Avatar com DiceBear

**API a criar**:
- `src/app/api/auth/login/route.ts` - POST - Login admin
- `src/app/api/auth/logout/route.ts` - POST - Logout admin
- `src/app/api/games/route.ts` - POST/GET - Criar/listar games
- `src/app/api/games/[token]/route.ts` - GET/DELETE - Detalhes/deletar game
- `src/app/api/participants/route.ts` - POST - Criar participante
- `src/app/api/teams/route.ts` - POST - Criar equipe

**Serviços a criar**:
- `src/lib/services/gameService.ts` - Lógica de games
- `src/lib/services/participantService.ts` - Lógica de participantes
- `src/lib/services/teamService.ts` - Lógica de equipes
- `src/lib/utils/tokenGenerator.ts` - Gerador de tokens

---

### User Story 2 (P1): Executar Rodada Individual

**Componentes a criar**:
- `src/components/participant/ReactionButton.tsx` - Botão de reação (amarelo/verde/vermelho)
- `src/components/admin/RoundControls.tsx` - Controles de rodada
- `src/components/participant/RoundStatus.tsx` - Status da rodada

**API a criar**:
- `src/app/api/rounds/route.ts` - POST - Criar rodada
- `src/app/api/rounds/[id]/route.ts` - PATCH - Atualizar participantes
- `src/app/api/rounds/[id]/start/route.ts` - POST - Iniciar rodada
- `src/app/api/rounds/[id]/stop/route.ts` - POST - Parar rodada
- `src/app/api/rounds/[id]/result/route.ts` - GET - Resultado

**Serviços a criar**:
- `src/lib/services/roundService.ts` - Lógica de rodadas
- `src/lib/utils/timing.ts` - Utilitários de timing

**Socket.io handlers a criar**:
- `src/lib/socket/handlers/roundHandlers.ts` - Eventos de rodada
- `src/lib/socket/handlers/presenceHandlers.ts` - Online/offline

---

### User Story 3 (P2): Gerenciar Múltiplas Rodadas

Usa mesma infraestrutura da US2, apenas adiciona lógica de replay.

---

### User Story 4 (P3): Visualização para Espectadores

**Componentes a criar**:
- `src/components/participant/SpectatorView.tsx` - Tela de espectador

---

## 10. Recursos e Documentação

### Documentação do Projeto

- **Especificação**: [spec.md](./spec.md) - Requisitos funcionais e user stories
- **Plano Técnico**: [plan.md](./plan.md) - Decisões de arquitetura e stack
- **Modelo de Dados**: [data-model.md](./data-model.md) - Esquema do banco de dados
- **API REST**: [contracts/rest-api.md](./contracts/rest-api.md) - Endpoints HTTP
- **WebSocket**: [contracts/websocket-events.md](./contracts/websocket-events.md) - Eventos Socket.io
- **Pesquisa Técnica**: [research.md](./research.md) - Decisões e alternativas

---

### Documentação Externa

- **Next.js 14**: https://nextjs.org/docs
- **React 19**: https://react.dev/
- **Tailwind CSS 4**: https://tailwindcss.com/docs
- **Supabase**: https://supabase.com/docs
- **Socket.io**: https://socket.io/docs/v4/
- **TypeScript**: https://www.typescriptlang.org/docs
- **DiceBear Avatars**: https://www.dicebear.com/
- **Font Awesome**: https://fontawesome.com/docs

---

### Convenções de Código (CLAUDE.md)

Consulte [CLAUDE.md](../../CLAUDE.md) para:
- Padrões de código TypeScript
- Estrutura de componentes React
- Convenções de API Routes
- Uso de Tailwind CSS (classes skeuomorphic)
- Princípios da constituição do projeto

---

## Diferenças do Quickstart Original

| Aspecto | Quickstart Original | Quickstart v2 (Este) |
|---------|-------------------|----------------------|
| **Ponto de partida** | Assume projeto vazio | Reconhece estado atual |
| **Versões** | Next 14, React 18, TW 3 | Next 16, React 19, TW 4 |
| **npm install** | Lista todas as 15+ deps | Só 2 deps que faltam (Supabase) |
| **Configurações** | Todas do zero | Só 3 ajustes necessários |
| **Estrutura** | Não considera template | Usa `src/` existente |
| **Tailwind** | `@tailwind` directives | `@import "tailwindcss"` (v4) |
| **Foco** | Tudo misturado | Separado: config → código → verificação |
| **Comprimento** | ~600 linhas | ~400 linhas (mais focado) |

---

## Suporte

**Dúvidas sobre configuração**: Revise este documento

**Dúvidas sobre implementação**: Consulte:
- [spec.md](./spec.md) - O QUE implementar
- [plan.md](./plan.md) - COMO arquitetar
- [contracts/](./contracts/) - APIs e contratos

**Dúvidas sobre princípios de código**: Consulte [constituição do projeto](../../.specify/memory/constitution.md)

---

**Bom desenvolvimento! 🚀**
