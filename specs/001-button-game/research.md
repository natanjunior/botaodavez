# Technical Research: Botão da Vez

**Feature**: 001-button-game
**Date**: 2025-12-26
**Purpose**: Document technical decisions and rationale for implementation approach

## Technology Stack Decisions

### 1. Framework: Next.js 14 (App Router)

**Decision**: Use Next.js 14 with App Router for unified full-stack development

**Rationale**:
- **Unified Development**: Eliminates need for separate frontend/backend projects
- **API Routes**: Built-in backend API support without additional server setup
- **Server Components**: Improved performance through server-side rendering
- **Type Safety**: Seamless TypeScript integration across client and server
- **Deployment Simplicity**: Single deployable unit (Vercel, Docker, etc.)
- **Developer Experience**: Hot reload, file-based routing, automatic code splitting

**Alternatives Considered**:
- **Separate React + Express**: More complex deployment, CORS configuration, duplicate type definitions
- **Create React App + Node.js**: Requires manual SSR setup, lacks modern features
- **Remix**: Similar benefits but smaller ecosystem and less PWA tooling maturity

**Implementation Notes**:
- Use App Router (not Pages Router) for better Server Component support
- Leverage Server Actions for form submissions
- API Routes in `app/api/` for REST endpoints
- Route groups `(admin)` and `(participant)` for logical organization

---

### 2. Real-Time Communication: Socket.io 4.x

**Decision**: Use Socket.io for WebSocket-based real-time features

**Rationale**:
- **Proven Library**: Battle-tested for real-time applications
- **Fallback Support**: Automatic fallback to long-polling if WebSocket unavailable
- **Event-Based**: Clean event-driven architecture for game state updates
- **Room Support**: Built-in room functionality for game isolation
- **TypeScript Support**: Good type definitions for type-safe events
- **Presence Detection**: Connection/disconnection events for online/offline status

**Alternatives Considered**:
- **Native WebSocket API**: No automatic reconnection, requires manual protocol implementation
- **Server-Sent Events (SSE)**: Unidirectional only, not suitable for bidirectional game control
- **Supabase Realtime**: Limited to database changes, not suitable for custom game state events
- **WebRTC**: Overkill for simple state synchronization, complex setup

**Implementation Notes**:
- Custom Next.js API route for Socket.io server: `app/api/socket/route.ts`
- Event types defined in `lib/socket/types.ts` for type safety
- Room per game (named by game token) for isolation
- Events: `round:start`, `round:button-click`, `round:result`, `participant:online`, etc.

---

### 3. Database: Supabase (PostgreSQL)

**Decision**: Use Supabase for database and authentication

**Rationale**:
- **Managed PostgreSQL**: No database administration overhead
- **Built-in Auth**: Admin authentication without custom JWT implementation
- **TypeScript Client**: Auto-generated types from database schema
- **Row-Level Security**: Built-in authorization at database level
- **Free Tier**: Generous limits suitable for family game app
- **Real-time Subscriptions**: Optional database change listeners (bonus feature)

**Alternatives Considered**:
- **Self-hosted PostgreSQL**: Requires DevOps setup, monitoring, backups
- **MongoDB**: NoSQL not ideal for relational game data (games → participants → teams)
- **Firebase**: Vendor lock-in, NoSQL structure, less SQL flexibility
- **PlanetScale**: Good but less feature-complete than Supabase for this use case

**Implementation Notes**:
- Connection string in `.env.local`
- Client initialization in `lib/db/supabase.ts`
- Database migrations in `supabase/migrations/`
- Use Supabase CLI for local development

---

### 4. Styling: Tailwind CSS 3.x + Custom Skeuomorphic Theme

**Decision**: Use Tailwind CSS with custom skeuomorphic design system

**Rationale**:
- **Utility-First**: Rapid UI development without context switching
- **Customization**: Easy to create custom skeuomorphic theme via config
- **Responsive**: Mobile-first responsive design out of the box
- **Tree-Shaking**: Unused styles removed in production
- **TypeScript Support**: Type-safe configuration

**Skeuomorphic Design Approach**:
- **Shadows**: Multiple layered box-shadows for depth effect
- **Gradients**: Subtle gradients for tactile, physical appearance
- **Borders**: Beveled edges, inset/outset effects
- **Textures**: CSS patterns for leather, wood, metal textures
- **Animation**: Button press animations (scale, shadow changes)

**Alternatives Considered**:
- **CSS Modules**: More boilerplate, harder to maintain design system
- **Styled Components**: Runtime overhead, less performance
- **Plain CSS**: No design system, harder to maintain consistency

**Implementation Notes**:
- Theme configuration in `tailwind.config.ts`
- Custom skeuomorphic utilities in `styles/skeuomorphic.css`
- Color palette: Warm retro colors (browns, golds, reds) for analog feel
- Font: Consider retro font from Google Fonts (e.g., "Press Start 2P" or "Cabin Sketch")

---

### 5. PWA Support: next-pwa

**Decision**: Use next-pwa plugin for Progressive Web App functionality

**Rationale**:
- **Zero Config**: Works out of the box with Next.js
- **Service Worker**: Automatic service worker generation
- **Offline Support**: Cache static assets for offline UI shell
- **Install Prompt**: Enables "Add to Home Screen" on mobile
- **Best Practices**: Follows PWA best practices automatically

**Alternatives Considered**:
- **Manual Service Worker**: Complex, error-prone, requires expertise
- **Workbox**: Lower-level than next-pwa, more configuration needed

**Implementation Notes**:
- Configure in `next.config.js`
- Manifest file at `public/manifest.json`
- Icons in `public/icons/` (multiple sizes for different devices)
- Offline page for disconnected state

---

### 6. Avatars: DiceBear API

**Decision**: Use DiceBear HTTP API for avatar generation

**Rationale**:
- **No Upload Required**: Generates avatars from participant names
- **Consistent Style**: Retro/fun avatar styles match skeuomorphic theme
- **Free**: No cost for basic usage
- **Variety**: Multiple style options (bottts, pixel-art, adventurer, etc.)
- **Deterministic**: Same name always generates same avatar

**Alternatives Considered**:
- **Gravatar**: Requires email, less variety, less control
- **Custom Illustrations**: Time-consuming, requires design work
- **File Uploads**: Adds complexity (storage, moderation, size limits)

**Implementation Notes**:
- API: `https://api.dicebear.com/7.x/[style]/svg?seed=[participantName]`
- Recommended style: "bottts" or "pixel-art" for retro aesthetic
- Client-side component: `components/shared/Avatar.tsx`
- Cache avatars in browser to reduce API calls

---

### 7. Icons: Font Awesome

**Decision**: Use Font Awesome for UI icons

**Rationale**:
- **Large Library**: 2000+ icons covering all UI needs
- **Consistent Style**: Professional, recognizable icons
- **React Component**: `@fortawesome/react-fontawesome` for type-safe usage
- **Free Tier**: Sufficient icons for this project
- **Customization**: Easy to style with Tailwind (color, size)

**Alternatives Considered**:
- **Heroicons**: Good but smaller library
- **Lucide React**: Modern but less skeuomorphic-friendly
- **Custom SVG Icons**: Time-consuming, inconsistent

**Implementation Notes**:
- Install: `@fortawesome/react-fontawesome` + icon packs
- Use solid style for skeuomorphic look: `@fortawesome/free-solid-svg-icons`
- Example: `<FontAwesomeIcon icon={faPlay} />` for round start button

---

## Architecture Patterns

### Service Layer Pattern

**Decision**: Implement service layer (`lib/services/`) for business logic

**Rationale**:
- Separates business logic from API routes and UI components
- Reusable across API routes and Server Components
- Testable in isolation (if tests added later)
- Aligns with Clean Code Architecture principle

**Structure**:
```typescript
// lib/services/roundService.ts
export class RoundService {
  async startRound(gameToken: string, participantIds: string[]) {
    // Business logic here
  }

  async calculateWinner(results: RoundResult[]) {
    // Winner determination logic
  }
}
```

---

### Repository Pattern (Lightweight)

**Decision**: Lightweight data access layer wrapping Supabase client

**Rationale**:
- Abstracts database operations from services
- Centralizes query logic
- Makes future database changes easier
- Keeps services focused on business logic

**Structure**:
```typescript
// lib/db/repositories/gameRepository.ts
export class GameRepository {
  async create(adminId: string): Promise<Game> {
    // Supabase insert
  }

  async findByToken(token: string): Promise<Game | null> {
    // Supabase query
  }
}
```

---

### Event-Driven WebSocket Architecture

**Decision**: Use Socket.io event handlers with typed events

**Rationale**:
- Decouples WebSocket logic from business logic
- Type-safe event contracts
- Easy to add new events without breaking existing code
- Room-based isolation prevents cross-game interference

**Structure**:
```typescript
// lib/socket/types.ts
export interface ServerToClientEvents {
  'round:started': (data: { countdown: number }) => void;
  'round:result': (data: { winner: Participant | null }) => void;
}

export interface ClientToServerEvents {
  'round:click': (data: { reactionTime: number }) => void;
}
```

---

## Performance Optimizations

### 1. Server Components by Default

Use React Server Components for most UI to reduce client-side JavaScript:
- Admin dashboard (mostly read-only)
- Game setup screens
- Spectator views

Reserve Client Components for:
- Reaction button (needs client-side timing)
- Real-time status indicators
- Forms with validation

---

### 2. WebSocket Room Isolation

Each game uses dedicated Socket.io room:
- Prevents unnecessary event broadcasting to unrelated games
- Reduces network overhead
- Improves scalability

---

### 3. Optimistic UI Updates

For better UX during WebSocket latency:
- Button state changes happen locally first
- Server confirmation updates if needed
- Rollback on error

---

### 4. Database Indexing

Index critical columns in PostgreSQL:
- `games.token` (unique, frequently queried)
- `participants.game_id` (foreign key joins)
- `rounds.game_id` (foreign key joins)

---

## Security Considerations

### 1. Admin Authentication

- Use Supabase Auth for admin login
- Secure session cookies (httpOnly, secure, sameSite)
- Row-Level Security (RLS) policies: admins can only access their own games

### 2. Participant Validation

- Token validation before joining game
- Rate limiting on game join endpoint (prevent spam)
- Participant name sanitization (prevent XSS)

### 3. WebSocket Security

- Validate game token on Socket.io connection
- Verify participant belongs to game before accepting events
- Rate limiting on button click events (prevent cheating)

### 4. Environment Variables

All secrets in `.env.local` (never committed):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)

---

## Development Workflow

### 1. Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with Supabase credentials

# Run Supabase locally (optional)
npx supabase start

# Run development server
npm run dev
```

### 2. Database Migrations

```bash
# Create new migration
npx supabase migration new <migration_name>

# Apply migrations
npx supabase db push
```

### 3. Type Generation

```bash
# Generate TypeScript types from Supabase schema
npx supabase gen types typescript --project-id <project-id> > lib/db/schema.ts
```

---

## Deployment Recommendations

### Option 1: Vercel (Recommended)

**Pros**:
- Zero-config Next.js deployment
- Automatic HTTPS, CDN, edge functions
- Free tier suitable for MVP
- Built-in environment variable management

**Cons**:
- Socket.io requires custom server (use Vercel Serverless Functions + external Socket.io server OR deploy Socket.io separately)

**Solution**: Deploy Socket.io server separately (e.g., Railway, Render) or use Vercel + Ably/Pusher for WebSocket

---

### Option 2: Docker + VPS

**Pros**:
- Full control over Socket.io server
- Single container for entire app
- Cost-effective for low traffic

**Cons**:
- Manual DevOps (SSL, monitoring, backups)
- No CDN unless added separately

---

### Recommended Deployment Strategy

**MVP**: Vercel for Next.js + Separate lightweight Socket.io server (Railway free tier)
**Production**: Evaluate traffic and consider unified Docker deployment if WebSocket scaling needed

---

## Testing Strategy (Future Consideration)

Per constitution and user requirement: **No automated testing for v1**.

However, document manual testing checklist in `quickstart.md`:
- Admin can create game and get token
- Participants can join with token
- Button synchronization works across devices
- Winner detection is accurate
- Online/offline status updates in real-time
