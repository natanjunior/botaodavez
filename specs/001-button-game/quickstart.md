# Quick Start Guide: Botão da Vez

**Feature**: 001-button-game
**Date**: 2025-12-26
**For**: Developers implementing the feature

## Prerequisites

- Node.js 18+ and npm
- Git
- Supabase account (free tier: https://supabase.com)
- Code editor (VS Code recommended)

---

## 1. Initial Setup

### Clone and Install

```bash
cd d:\Dev\wsprojects\botaodavez

# Install dependencies
npm install

# Install specific dependencies for this feature
npm install \
  next@14 \
  react@18 \
  react-dom@18 \
  socket.io@4 \
  socket.io-client@4 \
  @supabase/supabase-js@2 \
  @supabase/auth-helpers-nextjs@latest \
  tailwindcss@3 \
  @fortawesome/react-fontawesome \
  @fortawesome/free-solid-svg-icons \
  next-pwa@5

# Install dev dependencies
npm install -D \
  typescript@5 \
  @types/react@18 \
  @types/node@20 \
  autoprefixer \
  postcss
```

---

### Configure Next.js

Create/update `next.config.js`:

```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for production deployment
  output: 'standalone',
  // Experimental features for Socket.io
  experimental: {
    serverActions: true
  }
};

module.exports = withPWA(nextConfig);
```

---

### Configure TypeScript

Create/update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

### Configure Tailwind CSS

Create `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Skeuomorphic retro palette
        primary: {
          DEFAULT: '#D4AF37', // Gold
          dark: '#B8941F',
          light: '#E6C95C'
        },
        secondary: {
          DEFAULT: '#8B4513', // Saddle Brown
          dark: '#6B3410',
          light: '#A0522D'
        },
        accent: {
          DEFAULT: '#DC143C', // Crimson
          dark: '#B00020',
          light: '#FF1744'
        },
        neutral: {
          DEFAULT: '#3E2723', // Dark Brown
          dark: '#1B0000',
          light: '#5D4037'
        },
        // Button states
        button: {
          disabled: '#757575',
          yellow: '#FFC107',
          green: '#4CAF50',
          red: '#F44336'
        }
      },
      boxShadow: {
        'skeu-button': 'inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 5px rgba(0,0,0,0.3)',
        'skeu-button-pressed': 'inset 0 2px 5px rgba(0,0,0,0.3)',
        'skeu-card': '0 4px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
      },
      fontFamily: {
        retro: ['Press Start 2P', 'cursive'],
        body: ['Roboto', 'sans-serif']
      }
    },
  },
  plugins: [],
};

export default config;
```

Create `styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Roboto:wght@400;700&display=swap');

/* Skeuomorphic utilities */
.skeu-surface {
  @apply bg-gradient-to-br from-neutral-light to-neutral-dark;
  @apply shadow-skeu-card;
  @apply border border-neutral-light;
}

.skeu-button {
  @apply bg-gradient-to-b from-primary-light to-primary-dark;
  @apply shadow-skeu-button;
  @apply border-2 border-primary-light;
  @apply transition-all duration-150;
  @apply active:shadow-skeu-button-pressed active:translate-y-1;
}
```

---

## 2. Supabase Setup

### Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: "botaodavez"
4. Choose region closest to you
5. Generate strong database password (save it!)
6. Wait for project to provision (~2 min)

---

### Set Environment Variables

Create `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Socket.io (optional, for production)
SOCKET_SERVER_URL=http://localhost:3000
```

**Get Supabase Keys**:
1. In Supabase Dashboard → Project Settings → API
2. Copy "Project URL" → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy "anon public" key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy "service_role" key (secret!) → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Important**: Add `.env.local` to `.gitignore` (should already be there)

---

### Run Database Migrations

Create migration file:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Create migration
mkdir -p supabase/migrations
```

Copy the SQL from `data-model.md` into `supabase/migrations/001_initial_schema.sql`

Run migration:

```bash
supabase db push
```

---

## 3. Project Structure Setup

Create directory structure:

```bash
# Core directories
mkdir -p app/(admin)/{dashboard,game/[token],login}
mkdir -p app/(participant)/{join,play/[token]}
mkdir -p app/api/{auth,games,participants,rounds,teams,socket}
mkdir -p components/{admin,participant,shared,ui}
mkdir -p lib/{services,socket/handlers,db,utils}
mkdir -p types
mkdir -p styles
mkdir -p public/{icons,fonts}
```

---

## 4. Core Implementation Files

### Supabase Client

Create `lib/db/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role (admin privileges)
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole!, {
  auth: { persistSession: false }
});
```

---

### Socket.io Server

Create `app/api/socket/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { Server } from 'socket.io';

let io: Server;

export async function GET(req: NextRequest) {
  if (!io) {
    // Initialize Socket.io server
    const httpServer = (req as any).socket.server;
    io = new Server(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false
    });

    io.on('connection', (socket) => {
      const { game_token, participant_id, role } = socket.handshake.query;

      // Join game room
      socket.join(game_token as string);

      // Handle events (see websocket-events.md)
      socket.on('participant:heartbeat', (data) => {
        // Update last_seen timestamp
      });

      socket.on('round:button-click', (data) => {
        // Record click, determine winner
      });

      socket.on('disconnect', () => {
        // Mark participant offline
      });
    });
  }

  return new Response('Socket.io server running', { status: 200 });
}
```

---

## 5. Development Workflow

### Start Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

---

### Manual Verification Checklist

Per constitution - **no automated tests**, use manual verification:

#### User Story 1: Criar e Configurar Game

- [ ] **Admin Login**
  - Navigate to `/login`
  - Enter email/password (create test admin in Supabase Auth first)
  - Verify redirect to `/dashboard`

- [ ] **Create Game**
  - Click "Novo Game" button
  - Verify token generated and displayed (6-8 chars)
  - Verify game appears in dashboard list

- [ ] **Participant Join**
  - Open incognito window
  - Navigate to `/join`
  - Enter game token from step above
  - Enter participant name (e.g., "João")
  - Verify redirect to `/play/[token]`
  - In admin dashboard, verify "João" appears in participant list
  - Verify online indicator shows green

- [ ] **Team Management**
  - In admin dashboard, click "Criar Equipe"
  - Enter name "Team Red", choose red color
  - Verify team appears in team list
  - Assign "João" to "Team Red"
  - Verify João's entry shows team badge

#### User Story 2: Executar Rodada Individual

- [ ] **Round Setup**
  - Have at least 2 participants joined
  - Click "Nova Rodada"
  - Select 2+ participants
  - Verify button appears (disabled) on participant screens

- [ ] **Round Start**
  - All participants online (check indicators)
  - Click "Jogar" button in admin dashboard
  - Verify countdown starts on participant screens
  - Button turns yellow

- [ ] **Button Behavior - Yellow Phase**
  - As participant, click button while yellow
  - Verify button turns red
  - Verify "Eliminado" message appears
  - In admin dashboard, verify participant marked eliminated

- [ ] **Button Behavior - Green Phase**
  - Wait for yellow timer to finish
  - Button turns green
  - Click as fast as possible
  - Verify reaction time submitted

- [ ] **Winner Determination**
  - After all participants clicked (or eliminated)
  - Verify winner displayed to admin
  - Verify winner displayed to all participants
  - Verify reaction times shown
  - Verify correct winner (lowest time, excluding eliminated)

- [ ] **Tie Scenario**
  - Difficult to test manually due to millisecond precision
  - Check database: If two participants have exact same `reaction_time`, both marked `is_winner = true`

- [ ] **All Eliminated Scenario**
  - Start round with 2 participants
  - Both click yellow button (before green)
  - Verify "Sem vencedor" message displayed

- [ ] **Manual Stop**
  - Start round
  - Before completion, click "Parar Rodada" in admin dashboard
  - Verify round cancelled message displayed to all

#### User Story 3: Gerenciar Múltiplas Rodadas

- [ ] **Replay Round**
  - After round completed, click "Jogar Outra Vez"
  - Verify same round UI, participants still selected
  - Start round again
  - Verify previous result is replaced (check database `round_results`)

- [ ] **Change Participants**
  - After round completed, click "Alterar Participantes"
  - Select different participants
  - Play round
  - Verify new participants see button, old ones don't

#### User Story 4: Visualização para Espectadores

- [ ] **Spectator View**
  - Have 3+ participants
  - Create round with only 2 selected
  - On 3rd participant's screen (not in round)
  - Verify shows "Quem está jogando: [names]"
  - After round completes, verify result displayed

---

### Common Issues & Debugging

**Issue**: Socket.io not connecting

**Debug**:
```bash
# Check Socket.io server is running
# In browser console:
const socket = io({ path: '/api/socket' });
socket.on('connect', () => console.log('Connected!'));
socket.on('connect_error', (err) => console.error('Error:', err));
```

**Issue**: Supabase queries failing

**Debug**:
```typescript
const { data, error } = await supabase.from('games').select('*');
if (error) console.error('Supabase error:', error);
```

**Issue**: Countdown timing inconsistent

**Debug**: Check client-side performance - use `performance.now()` for higher precision

---

## 6. Build for Production

### Generate Static Assets

```bash
npm run build
```

### Test Production Build Locally

```bash
npm run start
```

Visit: http://localhost:3000

---

## 7. Deployment

### Option 1: Vercel (Recommended for MVP)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
```

**Note**: Socket.io on Vercel requires separate deployment or alternative (Pusher, Ably). Consider deploying Socket.io server separately on Railway/Render.

---

### Option 2: Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t botaodavez .
docker run -p 3000:3000 --env-file .env.local botaodavez
```

---

## 8. Progressive Web App (PWA)

### Create Manifest

Create `public/manifest.json`:

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
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Generate Icons

Use online tool like https://realfavicongenerator.net/
Upload logo, download icons, place in `public/icons/`

---

## 9. Development Tips

### Hot Reload

Next.js automatically reloads on file changes. If Socket.io doesn't reload:

```bash
# Restart dev server
npm run dev
```

---

### Database Migrations

After modifying schema:

```bash
# Create new migration
supabase migration new <description>

# Apply migration
supabase db push
```

---

### Type Generation from Database

```bash
# Generate TypeScript types from Supabase schema
npx supabase gen types typescript --project-id <your-project-id> > lib/db/schema.ts
```

---

## 10. Next Steps

After setup complete:

1. **Implement User Story 1** (spec.md) - Admin can create games, participants can join
2. **Implement User Story 2** - Round execution with button mechanics
3. **Implement User Story 3** - Multiple round plays
4. **Implement User Story 4** - Spectator view
5. **Polish UI** - Skeuomorphic styling, animations
6. **PWA Testing** - Install on mobile device, test offline

---

## Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **Socket.io Docs**: https://socket.io/docs/v4/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **DiceBear Avatars**: https://www.dicebear.com/
- **Font Awesome**: https://fontawesome.com/docs

---

## Support

For questions about this implementation:
- Review `spec.md` for requirements
- Review `data-model.md` for database schema
- Review `contracts/` for API details
- Check constitution in `.specify/memory/constitution.md` for coding principles
