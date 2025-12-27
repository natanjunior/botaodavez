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
