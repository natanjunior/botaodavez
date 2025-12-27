# Data Model: Botão da Vez

**Feature**: 001-button-game
**Date**: 2025-12-26
**Database**: PostgreSQL (via Supabase)

## Entity Relationship Diagram

```
┌─────────────┐
│ Admin       │
└──────┬──────┘
       │ 1
       │
       │ *
┌──────▼──────────┐         ┌──────────────┐
│ Game            │◄────────┤ Team         │
└──────┬──────────┘    *    └──────┬───────┘
       │ 1                          │
       │                            │
       │ *                          │ *
┌──────▼──────────┐                 │
│ Participant     ├─────────────────┘
└──────┬──────────┘          *
       │
       │ *         ┌────────────────┐
       └───────────► Round          │
                   └────────┬───────┘
                            │ *
                            │
                   ┌────────▼────────┐
                   │ RoundResult     │
                   └─────────────────┘
```

**Relationships**:
- Admin ──< Game (1:N - One admin owns many games)
- Game ──< Participant (1:N - One game has many participants)
- Game ──< Team (1:N - One game has many teams, teams are optional)
- Team ──< Participant (1:N - One team has many participants, nullable)
- Game ──< Round (1:N - One game has many rounds)
- Round ──< Participant (M:N - Many participants in many rounds via junction table or array)
- Round ──< RoundResult (1:N - One round has many results, one per participant per play)

---

## Tables

### 1. admins

**Purpose**: Store admin user accounts

| Column          | Type         | Constraints           | Description                          |
|-----------------|--------------|----------------------|--------------------------------------|
| id              | UUID         | PRIMARY KEY          | Unique admin identifier (Supabase Auth user ID) |
| email           | VARCHAR(255) | UNIQUE, NOT NULL     | Admin email for login                |
| created_at      | TIMESTAMP    | DEFAULT NOW()        | Account creation timestamp           |
| updated_at      | TIMESTAMP    | DEFAULT NOW()        | Last update timestamp                |

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE INDEX ON (email)`

**Notes**:
- `id` matches Supabase Auth `auth.users.id` for seamless integration
- Password handled by Supabase Auth (not stored in this table)
- `email` used for login identifier

---

### 2. games

**Purpose**: Store game sessions created by admins

| Column          | Type         | Constraints              | Description                                  |
|-----------------|--------------|-------------------------|----------------------------------------------|
| id              | UUID         | PRIMARY KEY             | Unique game identifier                       |
| admin_id        | UUID         | FK → admins.id, NOT NULL | Admin who owns this game                     |
| token           | VARCHAR(8)   | UNIQUE, NOT NULL        | Alphanumeric token for participant access    |
| created_at      | TIMESTAMP    | DEFAULT NOW()           | Game creation timestamp                      |
| updated_at      | TIMESTAMP    | DEFAULT NOW()           | Last update timestamp                        |

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE INDEX ON (token)` ← Critical for fast token lookups
- `INDEX ON (admin_id)` ← For admin dashboard queries

**Validation Rules**:
- `token`: 6-8 uppercase alphanumeric characters (e.g., "A3X9K2")
- Generated server-side to ensure uniqueness

**Notes**:
- Games never expire (persist until admin deletes)
- Token is the only credential needed for participants to join

---

### 3. teams

**Purpose**: Store team configurations within a game

| Column          | Type         | Constraints                 | Description                          |
|-----------------|--------------|----------------------------|--------------------------------------|
| id              | UUID         | PRIMARY KEY                | Unique team identifier               |
| game_id         | UUID         | FK → games.id, NOT NULL     | Game this team belongs to            |
| name            | VARCHAR(100) | NOT NULL                   | Team name (e.g., "Team Red")         |
| color           | VARCHAR(7)   | NOT NULL                   | Hex color code (e.g., "#FF0000")     |
| created_at      | TIMESTAMP    | DEFAULT NOW()              | Team creation timestamp              |

**Indexes**:
- `PRIMARY KEY (id)`
- `INDEX ON (game_id)` ← For loading teams per game

**Validation Rules**:
- `name`: 1-100 characters, trimmed
- `color`: Valid hex color format (#RRGGBB)

**Notes**:
- Teams are optional per game
- Deleting a game cascades to delete teams
- Participants reference teams via nullable `team_id`

---

### 4. participants

**Purpose**: Store participants who join games

| Column          | Type         | Constraints                    | Description                                |
|-----------------|--------------|-------------------------------|---------------------------------------------|
| id              | UUID         | PRIMARY KEY                   | Unique participant identifier               |
| game_id         | UUID         | FK → games.id, NOT NULL        | Game this participant belongs to            |
| team_id         | UUID         | FK → teams.id, NULL            | Team assignment (null if no teams)          |
| name            | VARCHAR(100) | NOT NULL                       | Participant display name                    |
| avatar_seed     | VARCHAR(100) | NULL                           | Seed for DiceBear avatar generation         |
| is_online       | BOOLEAN      | DEFAULT FALSE                  | Current online/offline status               |
| last_seen       | TIMESTAMP    | DEFAULT NOW()                  | Last activity timestamp (for presence)      |
| joined_at       | TIMESTAMP    | DEFAULT NOW()                  | When participant joined game                |

**Indexes**:
- `PRIMARY KEY (id)`
- `INDEX ON (game_id)` ← For loading participants per game
- `INDEX ON (team_id)` ← For loading participants per team

**Validation Rules**:
- `name`: 1-100 characters, trimmed, no special characters (prevent XSS)
- `avatar_seed`: Defaults to `name` if not provided
- `is_online`: Updated via WebSocket connection events

**Notes**:
- No authentication required (passwordless participation)
- `is_online` updated by Socket.io presence handlers
- `last_seen` updated on every WebSocket heartbeat
- Deleting a game cascades to delete participants

---

### 5. rounds

**Purpose**: Store round configurations and state

| Column              | Type         | Constraints                      | Description                                    |
|---------------------|--------------|----------------------------------|------------------------------------------------|
| id                  | UUID         | PRIMARY KEY                      | Unique round identifier                        |
| game_id             | UUID         | FK → games.id, NOT NULL           | Game this round belongs to                     |
| status              | VARCHAR(20)  | NOT NULL, DEFAULT 'waiting'      | Round status: waiting, in_progress, completed  |
| countdown_duration  | INTEGER      | NULL                             | Random countdown (ms), set when round starts   |
| started_at          | TIMESTAMP    | NULL                             | When round started (null if not started)       |
| completed_at        | TIMESTAMP    | NULL                             | When round completed (null if not completed)   |
| created_at          | TIMESTAMP    | DEFAULT NOW()                    | Round creation timestamp                       |

**Indexes**:
- `PRIMARY KEY (id)`
- `INDEX ON (game_id, status)` ← For loading active rounds per game

**Validation Rules**:
- `status`: ENUM-like constraint (`waiting`, `in_progress`, `completed`)
- `countdown_duration`: 1000-5000 milliseconds (when set)

**State Transitions**:
1. **waiting** → Admin selects participants, round not started
2. **in_progress** → Admin clicked "Play", countdown sent to participants
3. **completed** → Round finished with result

**Notes**:
- Only one round per game can be `in_progress` at a time (enforced by business logic)
- `countdown_duration` randomly generated on round start (e.g., 2350ms)
- Deleting a game cascades to delete rounds

---

### 6. round_participants

**Purpose**: Junction table - which participants are in which rounds

| Column          | Type         | Constraints                           | Description                              |
|-----------------|--------------|---------------------------------------|------------------------------------------|
| id              | UUID         | PRIMARY KEY                           | Unique identifier                        |
| round_id        | UUID         | FK → rounds.id, NOT NULL               | Round reference                          |
| participant_id  | UUID         | FK → participants.id, NOT NULL         | Participant reference                    |
| added_at        | TIMESTAMP    | DEFAULT NOW()                         | When participant added to round          |

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE INDEX ON (round_id, participant_id)` ← Prevent duplicate entries
- `INDEX ON (round_id)` ← For loading participants per round

**Notes**:
- Allows M:N relationship between rounds and participants
- Same participant can be in multiple rounds
- Admin can change participants between plays of same round

---

### 7. round_results

**Purpose**: Store results of each round play (reaction times, elimininations, winners)

| Column          | Type         | Constraints                           | Description                                      |
|-----------------|--------------|---------------------------------------|--------------------------------------------------|
| id              | UUID         | PRIMARY KEY                           | Unique result identifier                         |
| round_id        | UUID         | FK → rounds.id, NOT NULL               | Round this result belongs to                     |
| participant_id  | UUID         | FK → participants.id, NOT NULL         | Participant who played                           |
| reaction_time   | INTEGER      | NULL                                  | Reaction time in milliseconds (null if eliminated) |
| was_eliminated  | BOOLEAN      | DEFAULT FALSE                         | True if clicked yellow button (too early)        |
| is_winner       | BOOLEAN      | DEFAULT FALSE                         | True if won the round (lowest reaction time)     |
| recorded_at     | TIMESTAMP    | DEFAULT NOW()                         | When result was recorded                         |

**Indexes**:
- `PRIMARY KEY (id)`
- `INDEX ON (round_id)` ← For loading results per round
- `INDEX ON (round_id, is_winner)` ← For finding winner quickly

**Validation Rules**:
- `reaction_time`: 0-10000 milliseconds (null if eliminated)
- If `was_eliminated = TRUE`, then `reaction_time = NULL` and `is_winner = FALSE`
- Only one participant can have `is_winner = TRUE` per round (or multiple if tie)

**Business Logic**:
- When round played again (same round, different participants), old results are **deleted**
- Winner determination: Lowest `reaction_time` among non-eliminated participants
- Tie handling: Multiple participants marked `is_winner = TRUE` if exact same `reaction_time`

**Notes**:
- Each play of a round generates one `round_results` entry per participating participant
- Replaying a round deletes previous results (per spec FR-019)
- Deleting a round cascades to delete results

---

## Database Schema (SQL)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Admins table (syncs with Supabase Auth)
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token VARCHAR(8) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_games_token ON games(token);
CREATE INDEX idx_games_admin_id ON games(admin_id);

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_teams_game_id ON teams(game_id);

-- Participants table
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  avatar_seed VARCHAR(100),
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP DEFAULT NOW(),
  joined_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_participants_game_id ON participants(game_id);
CREATE INDEX idx_participants_team_id ON participants(team_id);

-- Rounds table
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  countdown_duration INTEGER,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT rounds_status_check CHECK (status IN ('waiting', 'in_progress', 'completed'))
);

CREATE INDEX idx_rounds_game_id_status ON rounds(game_id, status);

-- Round participants junction table
CREATE TABLE round_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(round_id, participant_id)
);

CREATE INDEX idx_round_participants_round_id ON round_participants(round_id);

-- Round results table
CREATE TABLE round_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  reaction_time INTEGER,
  was_eliminated BOOLEAN DEFAULT FALSE,
  is_winner BOOLEAN DEFAULT FALSE,
  recorded_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT round_results_elimination_check CHECK (
    (was_eliminated = FALSE AND reaction_time IS NOT NULL) OR
    (was_eliminated = TRUE AND reaction_time IS NULL AND is_winner = FALSE)
  )
);

CREATE INDEX idx_round_results_round_id ON round_results(round_id);
CREATE INDEX idx_round_results_round_id_winner ON round_results(round_id, is_winner);
```

---

## TypeScript Types (Generated from Schema)

```typescript
// types/game.ts (derived from database)

export interface Admin {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  admin_id: string;
  token: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  game_id: string;
  name: string;
  color: string; // Hex format
  created_at: string;
}

export interface Participant {
  id: string;
  game_id: string;
  team_id: string | null;
  name: string;
  avatar_seed: string | null;
  is_online: boolean;
  last_seen: string;
  joined_at: string;
}

export interface Round {
  id: string;
  game_id: string;
  status: 'waiting' | 'in_progress' | 'completed';
  countdown_duration: number | null; // milliseconds
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface RoundParticipant {
  id: string;
  round_id: string;
  participant_id: string;
  added_at: string;
}

export interface RoundResult {
  id: string;
  round_id: string;
  participant_id: string;
  reaction_time: number | null; // milliseconds
  was_eliminated: boolean;
  is_winner: boolean;
  recorded_at: string;
}

// Extended types with relations
export interface ParticipantWithTeam extends Participant {
  team?: Team;
}

export interface RoundWithParticipants extends Round {
  participants: Participant[];
}

export interface RoundWithResults extends Round {
  results: RoundResult[];
}

export interface GameWithDetails extends Game {
  admin: Admin;
  participants: ParticipantWithTeam[];
  teams: Team[];
  rounds: Round[];
}
```

---

## Migration Strategy

### Migration 001: Initial Schema

```sql
-- File: supabase/migrations/001_initial_schema.sql
-- (SQL from "Database Schema" section above)
```

### Migration 002: Add Row-Level Security (RLS)

```sql
-- File: supabase/migrations/002_add_rls_policies.sql

-- Enable RLS on all tables
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_results ENABLE ROW LEVEL SECURITY;

-- Admin policies: Admins can only access their own data
CREATE POLICY "Admins can view own profile"
  ON admins FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view own games"
  ON games FOR SELECT
  USING (auth.uid() = admin_id);

CREATE POLICY "Admins can create games"
  ON games FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Admins can update own games"
  ON games FOR UPDATE
  USING (auth.uid() = admin_id);

CREATE POLICY "Admins can delete own games"
  ON games FOR DELETE
  USING (auth.uid() = admin_id);

-- Participant policies: Public read for participants in same game
CREATE POLICY "Anyone can join game as participant"
  ON participants FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Participants visible to game members"
  ON participants FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins can update participants in their games"
  ON participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = participants.game_id
      AND games.admin_id = auth.uid()
    )
  );

-- Similar policies for teams, rounds, round_participants, round_results
-- (Admins can CRUD for their games, participants can read)
```

---

## Data Access Patterns

### 1. Load Game Dashboard (Admin View)

```typescript
// Query: Get game with participants, teams, and active round
const { data: game } = await supabase
  .from('games')
  .select(`
    *,
    participants(*, team:teams(*)),
    teams(*),
    rounds(*, round_participants(participant:participants(*)))
  `)
  .eq('token', gameToken)
  .single();
```

**Optimization**: Use Supabase's nested queries to minimize round-trips

---

### 2. Check Participant Online Status

```typescript
// Query: Get all participants with online status
const { data: participants } = await supabase
  .from('participants')
  .select('id, name, is_online')
  .eq('game_id', gameId);
```

**Optimization**: Subscribe to real-time updates via Supabase Realtime for instant status changes

---

### 3. Determine Round Winner

```typescript
// Query: Get all round results, sorted by reaction time
const { data: results } = await supabase
  .from('round_results')
  .select('*, participant:participants(name)')
  .eq('round_id', roundId)
  .eq('was_eliminated', false)
  .order('reaction_time', { ascending: true });

// Business logic: First result = winner (or multiple if tied)
```

---

## Caching Strategy

**No client-side caching** for critical game state (rounds, results) to ensure consistency.

**Cache avatars** in browser (DiceBear API responses) to reduce API calls.

**Supabase Realtime** for live updates eliminates need for polling.
