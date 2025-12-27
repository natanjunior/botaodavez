# WebSocket Events: Botão da Vez

**Feature**: 001-button-game
**Date**: 2025-12-26
**Protocol**: Socket.io 4.x
**Connection URL**: `/api/socket` (Next.js API route with Socket.io server)

## Connection & Authentication

### Client Connection

```typescript
import { io } from 'socket.io-client';

const socket = io({
  path: '/api/socket',
  query: {
    game_token: 'A3X9K2',
    participant_id: 'uuid',  // Optional for admin
    role: 'participant'  // or 'admin'
  }
});
```

**Authentication**:
- **Participants**: `game_token` + `participant_id` (validated against database)
- **Admin**: Supabase Auth session cookie

**Connection Events**:
- `connect`: Successfully connected to Socket.io server
- `connect_error`: Connection failed (invalid token or auth)
- `disconnect`: Disconnected from server

---

## Rooms

Each game has a dedicated Socket.io room named by its token (e.g., room `"A3X9K2"`).

**Joining Room** (server-side on connection):
```typescript
socket.join(gameToken);
```

**Room Isolation**: Events broadcast to specific game room only, preventing cross-game interference.

---

## Event Types

### Server → Client Events (Received by participants/admin)

| Event Name              | Emitted By | Received By        | Purpose                                    |
|------------------------|------------|-------------------|-------------------------------------------|
| `participant:joined`   | Server     | Admin + Participants | New participant joined game              |
| `participant:left`     | Server     | Admin + Participants | Participant disconnected                 |
| `participant:online`   | Server     | Admin              | Participant came online                  |
| `participant:offline`  | Server     | Admin              | Participant went offline                 |
| `round:created`        | Server     | Admin + Participants | New round created                        |
| `round:updated`        | Server     | Admin + Participants | Round participants changed               |
| `round:started`        | Server     | Selected Participants | Round started (countdown begins)         |
| `round:button-active`  | Server     | Selected Participants | Button turned green (can click now)      |
| `round:result`         | Server     | Admin + Participants | Round completed with result              |
| `round:cancelled`      | Server     | Admin + Participants | Admin stopped round                      |
| `team:created`         | Server     | Admin + Participants | New team created                         |
| `team:updated`         | Server     | Admin + Participants | Team modified                            |
| `team:deleted`         | Server     | Admin + Participants | Team deleted                             |

---

### Client → Server Events (Sent by participants/admin)

| Event Name              | Sent By      | Purpose                                    |
|------------------------|-------------|-------------------------------------------|
| `participant:heartbeat` | Participant | Periodic presence signal (keep-alive)     |
| `round:button-click`   | Participant | Participant clicked button (send time)    |
| `round:eliminate`      | Participant | Participant clicked yellow button (eliminated) |

---

## Event Payloads

### participant:joined

**Direction**: Server → All in game room

**Payload**:
```typescript
{
  participant: {
    id: string;
    name: string;
    avatar_seed: string;
    team_id: string | null;
    is_online: boolean;
  }
}
```

**Use Case**: Update participant list UI in real-time when someone joins

---

### participant:left

**Direction**: Server → All in game room

**Payload**:
```typescript
{
  participant_id: string;
}
```

**Use Case**: Remove participant from UI when they disconnect

---

### participant:online / participant:offline

**Direction**: Server → Admin only

**Payload**:
```typescript
{
  participant_id: string;
  is_online: boolean;
}
```

**Use Case**: Update online/offline indicator in admin dashboard

**Trigger**: Heartbeat timeout (30s) or explicit disconnect

---

### round:created

**Direction**: Server → All in game room

**Payload**:
```typescript
{
  round: {
    id: string;
    game_id: string;
    status: 'waiting';
    participants: Array<{
      id: string;
      name: string;
    }>;
    created_at: string;
  }
}
```

**Use Case**: Show new round in game UI

---

### round:updated

**Direction**: Server → All in game room

**Payload**:
```typescript
{
  round_id: string;
  participants: Array<{
    id: string;
    name: string;
  }>;
}
```

**Use Case**: Admin changed round participants, update UI

---

### round:started

**Direction**: Server → Selected participants only (room: `round-${roundId}`)

**Payload**:
```typescript
{
  round_id: string;
  countdown_duration: number;  // milliseconds (e.g., 2350)
  started_at: string;  // ISO timestamp
}
```

**Client Behavior**:
1. Start local countdown timer with `countdown_duration`
2. Display yellow button during countdown
3. When countdown reaches 0:
   - Change button to green
   - Start local reaction timer
4. On button click:
   - Record reaction time
   - Emit `round:button-click` event

**Use Case**: Synchronize button color change across all participant devices

---

### round:button-active

**Direction**: Server → Selected participants (optional, for extra sync)

**Payload**:
```typescript
{
  round_id: string;
}
```

**Use Case**: Backup signal that button should turn green (in case countdown drift)

**Note**: May not be needed if client-side countdown is accurate enough

---

### round:result

**Direction**: Server → All in game room

**Payload**:
```typescript
{
  round_id: string;
  status: 'completed';
  results: Array<{
    participant: {
      id: string;
      name: string;
    };
    reaction_time: number | null;  // null if eliminated
    was_eliminated: boolean;
    is_winner: boolean;
  }>;
  winner: {
    id: string;
    name: string;
  } | null;  // null if all eliminated
  winners?: Array<{  // If tie
    id: string;
    name: string;
  }>;
  message?: string;  // e.g., "All participants eliminated"
}
```

**Use Case**: Display round result to admin and all participants (including spectators)

**Trigger**: All selected participants submitted click or were eliminated

---

### round:cancelled

**Direction**: Server → All in game room

**Payload**:
```typescript
{
  round_id: string;
  reason: 'admin_stop' | 'timeout';
}
```

**Use Case**: Admin manually stopped round, or timeout occurred

---

### team:created / team:updated

**Direction**: Server → All in game room

**Payload**:
```typescript
{
  team: {
    id: string;
    game_id: string;
    name: string;
    color: string;  // hex
  }
}
```

**Use Case**: Update team list in UI

---

### team:deleted

**Direction**: Server → All in game room

**Payload**:
```typescript
{
  team_id: string;
}
```

**Use Case**: Remove team from UI

---

### participant:heartbeat

**Direction**: Participant → Server

**Payload**:
```typescript
{
  participant_id: string;
  timestamp: number;  // client timestamp (for latency measurement)
}
```

**Frequency**: Every 10 seconds

**Server Behavior**:
- Update `participants.last_seen` timestamp
- If no heartbeat for 30 seconds, mark `is_online = false`
- Emit `participant:offline` event to admin

**Use Case**: Maintain accurate online/offline status

---

### round:button-click

**Direction**: Participant → Server

**Payload**:
```typescript
{
  round_id: string;
  participant_id: string;
  reaction_time: number;  // milliseconds from green button to click
  client_timestamp: number;  // for verification/anti-cheat
}
```

**Validation** (server-side):
- Verify participant is in this round
- Verify round is in `in_progress` status
- Verify reaction_time is reasonable (> 0ms, < 10000ms)
- Ignore duplicate submissions

**Server Behavior**:
1. Record result in `round_results` table
2. Check if all participants submitted
3. If all submitted:
   - Calculate winner (lowest reaction_time)
   - Update round status to `completed`
   - Emit `round:result` to entire game room

**Use Case**: Submit participant's reaction time when they click green button

---

### round:eliminate

**Direction**: Participant → Server

**Payload**:
```typescript
{
  round_id: string;
  participant_id: string;
  reason: 'clicked_yellow';  // Clicked before button turned green
}
```

**Server Behavior**:
1. Record result with `was_eliminated = true`, `reaction_time = null`
2. Check if all participants submitted or eliminated
3. If all done, calculate result (may be no winner if all eliminated)

**Use Case**: Participant clicked button while it was still yellow (too early)

---

## Connection Lifecycle

### 1. Participant Connects

```typescript
// Client
const socket = io({
  query: {
    game_token: 'A3X9K2',
    participant_id: 'uuid',
    role: 'participant'
  }
});

socket.on('connect', () => {
  console.log('Connected to game');
});

// Server validates and joins room
socket.join(gameToken);
socket.to(gameToken).emit('participant:online', {
  participant_id: participantId,
  is_online: true
});
```

---

### 2. Participant Disconnects

```typescript
// Server handles disconnect
socket.on('disconnect', () => {
  // Update database
  await updateParticipantStatus(participantId, false);

  // Notify others
  socket.to(gameToken).emit('participant:offline', {
    participant_id: participantId,
    is_online: false
  });
});
```

---

### 3. Round Flow

**Admin starts round**:
```typescript
// Admin calls REST API: POST /api/rounds/:id/start
// Server broadcasts to participants:
io.to(gameToken).emit('round:started', {
  round_id: 'uuid',
  countdown_duration: 2350,
  started_at: '2025-12-26T10:00:00Z'
});
```

**Participant clicks button**:
```typescript
// Client
socket.emit('round:button-click', {
  round_id: 'uuid',
  participant_id: 'uuid',
  reaction_time: 235
});

// Server records and broadcasts result when all done
io.to(gameToken).emit('round:result', { /* result data */ });
```

---

## Error Handling

### Connection Errors

**Invalid Token**:
```typescript
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
  // error.message: "Invalid game token"
});
```

**Participant Not Found**:
```typescript
socket.on('connect_error', (error) => {
  // error.message: "Participant not found in game"
});
```

---

### Event Errors

Server can emit `error` event for invalid operations:

```typescript
socket.on('error', (error) => {
  console.error('Operation failed:', error);
});

// Example error payload:
{
  event: 'round:button-click',
  code: 'ROUND_NOT_ACTIVE',
  message: 'Round is not in progress'
}
```

---

## Client Implementation Example (Participant)

```typescript
import { io, Socket } from 'socket.io-client';

export class GameClient {
  private socket: Socket;

  constructor(gameToken: string, participantId: string) {
    this.socket = io({
      path: '/api/socket',
      query: { game_token: gameToken, participant_id: participantId, role: 'participant' }
    });

    this.setupListeners();
  }

  private setupListeners() {
    this.socket.on('round:started', this.handleRoundStart);
    this.socket.on('round:result', this.handleRoundResult);
  }

  private handleRoundStart = (data: { round_id: string; countdown_duration: number }) => {
    // Start local countdown
    const countdown = data.countdown_duration;
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 10;
      this.updateButtonState('yellow', countdown - elapsed);

      if (elapsed >= countdown) {
        clearInterval(interval);
        this.updateButtonState('green', 0);
        this.startReactionTimer(data.round_id);
      }
    }, 10);
  };

  private startReactionTimer(roundId: string) {
    const startTime = Date.now();

    // Wait for button click
    this.onButtonClick = () => {
      const reactionTime = Date.now() - startTime;
      this.socket.emit('round:button-click', {
        round_id: roundId,
        participant_id: this.participantId,
        reaction_time: reactionTime
      });
    };
  }

  private handleRoundResult = (data: any) => {
    // Display winner
    console.log('Winner:', data.winner);
  };
}
```

---

## TypeScript Types

```typescript
// Socket event type definitions

export interface ServerToClientEvents {
  'participant:joined': (data: { participant: Participant }) => void;
  'participant:left': (data: { participant_id: string }) => void;
  'participant:online': (data: { participant_id: string; is_online: boolean }) => void;
  'participant:offline': (data: { participant_id: string; is_online: boolean }) => void;
  'round:created': (data: { round: Round }) => void;
  'round:updated': (data: { round_id: string; participants: Participant[] }) => void;
  'round:started': (data: { round_id: string; countdown_duration: number; started_at: string }) => void;
  'round:button-active': (data: { round_id: string }) => void;
  'round:result': (data: RoundResultEvent) => void;
  'round:cancelled': (data: { round_id: string; reason: string }) => void;
  'team:created': (data: { team: Team }) => void;
  'team:updated': (data: { team: Team }) => void;
  'team:deleted': (data: { team_id: string }) => void;
  'error': (data: { event: string; code: string; message: string }) => void;
}

export interface ClientToServerEvents {
  'participant:heartbeat': (data: { participant_id: string; timestamp: number }) => void;
  'round:button-click': (data: { round_id: string; participant_id: string; reaction_time: number }) => void;
  'round:eliminate': (data: { round_id: string; participant_id: string; reason: string }) => void;
}

export interface RoundResultEvent {
  round_id: string;
  status: 'completed';
  results: Array<{
    participant: { id: string; name: string };
    reaction_time: number | null;
    was_eliminated: boolean;
    is_winner: boolean;
  }>;
  winner?: { id: string; name: string } | null;
  winners?: Array<{ id: string; name: string }>;
  message?: string;
}
```

---

## Performance Considerations

### Latency Optimization

**Client-Side Countdown**: Countdown runs locally to avoid network latency affecting button color change timing.

**Reaction Time Measurement**: Measured client-side from green button appearance to click, not round-trip time.

**Heartbeat Frequency**: 10-second intervals balance accuracy with network overhead.

---

### Scalability

**Room-Based Broadcasting**: Only participants in same game receive events (not all connected clients).

**Connection Pooling**: Socket.io manages connection pooling automatically.

**Horizontal Scaling**: For multiple server instances, use Socket.io Redis adapter:
```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```
