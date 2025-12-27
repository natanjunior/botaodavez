# Implementation Plan: Botão da Vez

**Branch**: `001-button-game` | **Date**: 2025-12-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-button-game/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implementar aplicação web para jogos familiares com mecânica de botão de reação. Administrador cria games com tokens, participantes entram sem autenticação, e sistema gerencia rodadas com sincronização em tempo real. Abordagem técnica: Next.js full-stack com API Routes, Socket.io para comunicação real-time, Supabase (PostgreSQL) para persistência, UI skeuomórfica com Tailwind CSS, e suporte PWA.

## Technical Context

**Language/Version**: TypeScript 5.x + Next.js 14 (App Router)
**Primary Dependencies**:
- Next.js 14.x (full-stack framework com API Routes)
- React 18.x (UI library)
- Socket.io 4.x (WebSocket real-time communication)
- Supabase JS Client 2.x (PostgreSQL database + auth)
- Tailwind CSS 3.x (styling)
- next-pwa (Progressive Web App support)
- DiceBear API (avatar generation)
- Font Awesome (icons)

**Storage**: PostgreSQL via Supabase (hosted database)
**Testing**: No automated testing per constitution and user requirement
**Target Platform**: Web (desktop + mobile browsers), installable PWA
**Project Type**: Web application (Next.js unified frontend + backend)
**Performance Goals**:
- Real-time sync latency < 200ms
- Button state transitions < 50ms
- Support 50 concurrent participants per game
- PWA offline capability for UI shell

**Constraints**:
- WebSocket connection required for real-time features
- Millisecond precision timing for reaction measurement
- Cross-device synchronization critical
- Skeuomorphic UI must work on touch and mouse

**Scale/Scope**:
- Target: Family/friends groups (2-50 participants per game)
- Concurrent games: Assume 100+ active games
- 5-10 key screens (admin dashboard, participant view, game setup, round play)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Clean Code Architecture Compliance

- [x] Functions and methods have single, well-defined purposes
- [x] Variables and functions use clear, intent-revealing names
- [x] Code is self-documenting (comments explain "why", not "what")
- [x] No code duplication; proper abstractions in place
- [x] Dependencies point inward: business logic independent of UI/infrastructure

**Violations**: N/A - Next.js structure naturally supports clean architecture with:
- Server Components for business logic
- Client Components for UI interactions
- API Routes for backend endpoints
- Service layer for database operations (Supabase client abstraction)

### II. Frontend-Backend Separation Compliance

- [x] Frontend code in dedicated frontend directories/projects
- [x] Backend code in dedicated backend directories/projects
- [x] Communication only through well-defined API contracts
- [x] Frontend does not directly access backend data stores or business logic
- [x] Backend agnostic to frontend implementation details

**Violations**: Justifiable deviation - Next.js unified structure, but logical separation maintained:
- `app/` - Frontend UI (Client Components, pages)
- `app/api/` - Backend API Routes (REST endpoints)
- `lib/services/` - Backend business logic (database operations, game logic)
- `lib/socket/` - WebSocket handlers (separate from HTTP routes)
- Frontend uses API contracts exclusively, never direct database access

**Justification**: Next.js full-stack approach eliminates need for separate backend project while maintaining logical separation of concerns through directory structure and module boundaries. Simpler deployment and development workflow.

### III. Simplicity First Compliance

- [x] Solution is the simplest that solves the actual problem
- [x] Complexity is justified by real, concrete requirements
- [x] No speculative features or premature future-proofing
- [x] All patterns, frameworks, dependencies deliver clear value
- [x] YAGNI principle observed

**Violations**: N/A

**Justification for complexity**:
- Socket.io: Required for real-time button synchronization (spec requirement FR-010 to FR-016)
- Supabase: Simplifies auth + PostgreSQL setup vs self-hosted database
- PWA: User requirement for installable experience
- Skeuomorphic design: User requirement for retro aesthetic

All dependencies directly address stated requirements. No speculative features included.

### Quality & Review

- [x] Manual review process defined for this feature
- [x] Review criteria clear and documented
- [x] No automated testing infrastructure required (per constitution)

**Notes**:
- Manual verification per user story (see spec.md)
- Review criteria: Clean code principles, API contract adherence, real-time sync accuracy
- No automated testing per user requirement and constitution

## Project Structure

### Documentation (this feature)

```text
specs/001-button-game/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── rest-api.md      # HTTP API endpoints
│   └── websocket-events.md  # Socket.io events
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Next.js App Router structure (unified frontend + backend)
botaodavez/
├── app/                          # Next.js App Router
│   ├── (admin)/                  # Admin route group
│   │   ├── dashboard/            # Admin dashboard page
│   │   ├── game/[token]/         # Game management page
│   │   └── login/                # Admin login page
│   ├── (participant)/            # Participant route group
│   │   ├── join/                 # Join game page (token entry)
│   │   └── play/[token]/         # Participant game view
│   ├── api/                      # Backend API Routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── games/                # Game CRUD
│   │   ├── participants/         # Participant management
│   │   ├── rounds/               # Round management
│   │   └── teams/                # Team management
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
│
├── components/                   # React components
│   ├── admin/                    # Admin-specific components
│   │   ├── GameDashboard.tsx
│   │   ├── ParticipantList.tsx
│   │   ├── TeamManager.tsx
│   │   └── RoundControls.tsx
│   ├── participant/              # Participant-specific components
│   │   ├── ReactionButton.tsx    # The main button component
│   │   ├── RoundStatus.tsx
│   │   └── SpectatorView.tsx
│   ├── shared/                   # Shared UI components
│   │   ├── Avatar.tsx            # DiceBear integration
│   │   ├── Button.tsx
│   │   └── Card.tsx              # Skeuomorphic card
│   └── ui/                       # Base UI primitives (Tailwind)
│
├── lib/                          # Backend logic & utilities
│   ├── services/                 # Business logic layer
│   │   ├── gameService.ts        # Game operations
│   │   ├── roundService.ts       # Round logic & timing
│   │   ├── participantService.ts
│   │   └── teamService.ts
│   ├── socket/                   # WebSocket logic
│   │   ├── server.ts             # Socket.io server setup
│   │   ├── handlers/             # Event handlers
│   │   │   ├── roundHandlers.ts  # Round events
│   │   │   ├── presenceHandlers.ts  # Online/offline
│   │   │   └── gameHandlers.ts
│   │   └── types.ts              # Socket event types
│   ├── db/                       # Database layer
│   │   ├── supabase.ts           # Supabase client
│   │   └── schema.ts             # Type definitions from DB
│   └── utils/                    # Utilities
│       ├── tokenGenerator.ts     # Game token generation
│       ├── timing.ts             # Timing utilities
│       └── validation.ts         # Input validation
│
├── styles/                       # Styling
│   ├── globals.css               # Global styles + Tailwind
│   └── skeuomorphic.css          # Custom skeuomorphic styles
│
├── public/                       # Static assets
│   ├── icons/                    # PWA icons
│   ├── manifest.json             # PWA manifest
│   └── fonts/                    # Custom fonts (if needed)
│
├── types/                        # TypeScript types
│   ├── game.ts                   # Game-related types
│   ├── participant.ts
│   ├── round.ts
│   └── api.ts                    # API request/response types
│
├── supabase/                     # Supabase migrations & config
│   └── migrations/               # Database migrations
│
├── next.config.js                # Next.js config (with next-pwa)
├── tailwind.config.ts            # Tailwind config (skeuomorphic theme)
├── tsconfig.json                 # TypeScript config
├── package.json
└── .env.local                    # Environment variables (Supabase keys)
```

**Structure Decision**: Using Next.js App Router unified structure instead of separate frontend/backend projects. This aligns with constitution's "Simplicity First" principle while maintaining logical separation through directory organization:

- **Frontend**: `app/` routes (Server + Client Components), `components/`
- **Backend**: `app/api/` (REST endpoints), `lib/services/` (business logic), `lib/socket/` (WebSocket)
- **Shared**: `types/` (contracts), `lib/db/` (data access layer)

This structure provides clear separation of concerns without unnecessary project complexity.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Next.js unified structure vs separate frontend/backend | Eliminates deployment complexity, reduces boilerplate, maintains logical separation via directories | Separate projects would require CORS setup, duplicate type definitions, more complex deployment (2 services vs 1), and violates "Simplicity First" without providing value for this use case |
| Socket.io dependency | Real-time synchronization is core requirement (FR-010 to FR-016) - HTTP polling cannot achieve <200ms latency and millisecond precision | HTTP polling would add complexity (client-side polling logic, server-side state management) and cannot meet performance requirements |
