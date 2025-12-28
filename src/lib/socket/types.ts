/**
 * WebSocket Event Types for Socket.io
 * Defines type-safe event interfaces for client-server communication
 */

// =============================================================================
// Payload Types
// =============================================================================

export interface ParticipantInfo {
  id: string;
  name: string;
  avatar_seed?: string;
  team_id?: string | null;
  is_online?: boolean;
}

export interface TeamInfo {
  id: string;
  game_id: string;
  name: string;
  color: string; // hex format
}

export interface RoundParticipantInfo {
  id: string;
  name: string;
}

export interface RoundResultInfo {
  participant: {
    id: string;
    name: string;
  };
  reaction_time: number | null; // null if eliminated
  was_eliminated: boolean;
  is_winner: boolean;
}

export interface RoundInfo {
  id: string;
  game_id: string;
  status: 'waiting' | 'in_progress' | 'completed';
  participants?: RoundParticipantInfo[];
  created_at: string;
}

// =============================================================================
// Server → Client Events
// =============================================================================

export interface ServerToClientEvents {
  // Connection events
  connected: (data: {
    socketId: string;
    gameToken: string;
    timestamp: string;
  }) => void;

  error: (data: {
    code: string;
    message: string;
  }) => void;

  // Participant events
  'participant:joined': (data: {
    participant: ParticipantInfo;
  }) => void;

  'participant:left': (data: {
    participant_id: string;
  }) => void;

  'participant:online': (data: {
    participant_id: string;
    game_token: string;
  }) => void;

  'participant:offline': (data: {
    participant_id: string;
    game_token: string;
  }) => void;

  // Round events
  'round:created': (data: {
    round: RoundInfo;
  }) => void;

  'round:updated': (data: {
    round_id: string;
    participants: RoundParticipantInfo[];
  }) => void;

  'round:started': (data: {
    round_id: string;
    countdown_duration: number; // milliseconds
    started_at: string; // ISO timestamp
  }) => void;

  'round:button-active': (data: {
    round_id: string;
  }) => void;

  'round:result': (data: {
    round_id: string;
    status: 'completed';
    results: RoundResultInfo[];
    winner?: {
      id: string;
      name: string;
    } | null;
    winners?: Array<{
      id: string;
      name: string;
    }>;
    message?: string;
  }) => void;

  'round:cancelled': (data: {
    round_id: string;
    reason: 'admin_stop' | 'timeout';
  }) => void;

  // Team events
  'team:created': (data: {
    team: TeamInfo;
  }) => void;

  'team:updated': (data: {
    team: TeamInfo;
  }) => void;

  'team:deleted': (data: {
    team_id: string;
  }) => void;
}

// =============================================================================
// Client → Server Events
// =============================================================================

export interface ClientToServerEvents {
  // Participant presence
  'participant:heartbeat': (data: {
    participant_id: string;
    timestamp: number; // client timestamp for latency measurement
  }) => void;

  // Round interaction
  'round:button-click': (data: {
    round_id: string;
    participant_id: string;
    reaction_time: number; // milliseconds from green button to click
    client_timestamp: number; // for verification/anti-cheat
  }) => void;

  'round:eliminate': (data: {
    round_id: string;
    participant_id: string;
    clicked_at: number; // timestamp when yellow button was clicked
  }) => void;
}

// =============================================================================
// Inter-Server Events (for scalability, future use)
// =============================================================================

export interface InterServerEvents {
  ping: () => void;
}

// =============================================================================
// Socket Data (stored in socket.data)
// =============================================================================

export interface SocketData {
  gameToken: string;
  participantId?: string;
  role: 'admin' | 'participant';
}

// =============================================================================
// Helper Types for Event Handlers
// =============================================================================

/**
 * Type-safe event handler for server events
 */
export type ServerEventHandler<E extends keyof ServerToClientEvents> = Parameters<
  ServerToClientEvents[E]
>[0];

/**
 * Type-safe event handler for client events
 */
export type ClientEventHandler<E extends keyof ClientToServerEvents> = Parameters<
  ClientToServerEvents[E]
>[0];

/**
 * Type for room names
 */
export type RoomName = `game:${string}` | `round:${string}`;

/**
 * Connection query parameters
 */
export interface ConnectionQuery {
  game_token: string;
  participant_id?: string;
  role: 'admin' | 'participant';
}

/**
 * Error codes for socket errors
 */
export enum SocketErrorCode {
  INVALID_TOKEN = 'INVALID_TOKEN',
  UNAUTHORIZED = 'UNAUTHORIZED',
  GAME_NOT_FOUND = 'GAME_NOT_FOUND',
  PARTICIPANT_NOT_FOUND = 'PARTICIPANT_NOT_FOUND',
  ROUND_NOT_FOUND = 'ROUND_NOT_FOUND',
  INVALID_ROUND_STATE = 'INVALID_ROUND_STATE',
  ALREADY_CLICKED = 'ALREADY_CLICKED',
  NOT_IN_ROUND = 'NOT_IN_ROUND',
  SERVER_ERROR = 'SERVER_ERROR',
}
