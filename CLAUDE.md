# botaodavez Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-26

## Active Technologies

### Frontend & Backend
- **TypeScript 5.x** - Type-safe development
- **Next.js 14 (App Router)** - Full-stack React framework
- **React 18** - UI library
- **Tailwind CSS 3** - Utility-first styling
- **Socket.io 4** - Real-time WebSocket communication

### Database & Backend Services
- **PostgreSQL** - Relational database (via Supabase)
- **Supabase** - Backend-as-a-Service (database, auth, real-time)

### PWA & Assets
- **next-pwa** - Progressive Web App support
- **DiceBear API** - Avatar generation
- **Font Awesome** - Icon library

## Project Structure

```text
app/                          # Next.js App Router
  (admin)/                    # Admin routes (protected)
  (participant)/              # Participant routes (public)
  api/                        # REST API endpoints
    auth/                     # Authentication
    games/                    # Game management
    participants/             # Participant management
    rounds/                   # Round management
    teams/                    # Team management
    socket/                   # Socket.io WebSocket server

components/                   # React components
  admin/                      # Admin-specific UI
  participant/                # Participant-specific UI
  shared/                     # Shared components
  ui/                         # Base UI primitives

lib/                          # Backend logic
  services/                   # Business logic layer
  socket/                     # WebSocket handlers
  db/                         # Database layer (Supabase)
  utils/                      # Utilities

types/                        # TypeScript type definitions

styles/                       # CSS styles
  globals.css               # Global + Tailwind
  skeuomorphic.css          # Custom retro styles

supabase/                     # Database migrations
  migrations/
```

## Commands

```bash
# Development
npm run dev                   # Start dev server (localhost:3000)

# Production
npm run build                 # Build for production
npm run start                 # Start production server

# Database
npx supabase db push          # Apply migrations
npx supabase gen types typescript --project-id <id> > lib/db/schema.ts

# Deployment
vercel                        # Deploy to Vercel
```

## Code Style

### TypeScript
- **Strict mode enabled** - No implicit any, strict null checks
- **Functional style preferred** - Use arrow functions, avoid classes unless needed
- **Explicit types** - Type function parameters and return values
- **Interfaces over types** - Use `interface` for object shapes

### React & Next.js
- **Server Components by default** - Use Client Components (`'use client'`) only when needed
- **Named exports** - Prefer named exports over default exports
- **File naming** - `PascalCase.tsx` for components, `camelCase.ts` for utilities
- **Component structure**:
  ```typescript
  // Props interface
  interface ComponentProps {
    title: string;
    onAction: () => void;
  }

  // Component definition
  export function Component({ title, onAction }: ComponentProps) {
    return <div>{title}</div>;
  }
  ```

### Tailwind CSS
- **Utility classes** - Use Tailwind utilities instead of custom CSS when possible
- **Skeuomorphic design** - Use custom `.skeu-*` classes from `styles/skeuomorphic.css`
- **Responsive** - Mobile-first responsive design
- **Color palette** - Use theme colors (primary, secondary, accent, button states)

### API Routes
- **RESTful conventions** - GET (read), POST (create), PATCH (update), DELETE (delete)
- **Error handling** - Return structured error responses with codes
- **Type safety** - Use TypeScript types for request/response bodies
- **Validation** - Validate all input data before processing

### Socket.io Events
- **Typed events** - Use `ServerToClientEvents` and `ClientToServerEvents` interfaces
- **Room isolation** - Use game token as room name
- **Error handling** - Emit `error` event for failures

## Recent Changes

- 001-button-game: Added TypeScript 5.x + Next.js 14 (App Router)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
