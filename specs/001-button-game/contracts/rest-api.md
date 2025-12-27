# REST API Contracts: Botão da Vez

**Feature**: 001-button-game
**Date**: 2025-12-26
**Base URL**: `/api`

## Authentication

**Admin Endpoints**: Require Supabase Auth session cookie
**Participant Endpoints**: Public (no auth required, token-based access)

---

## Admin Authentication Endpoints

### POST /api/auth/login

**Purpose**: Admin login

**Request**:
```json
{
  "email": "admin@example.com",
  "password": "securepassword123"
}
```

**Response (200 OK)**:
```json
{
  "admin": {
    "id": "uuid",
    "email": "admin@example.com"
  },
  "session": {
    "access_token": "jwt-token",
    "expires_at": 1234567890
  }
}
```

**Errors**:
- `401 Unauthorized`: Invalid credentials
- `400 Bad Request`: Missing fields

---

### POST /api/auth/logout

**Purpose**: Admin logout

**Request**: Empty body

**Response (200 OK)**:
```json
{
  "message": "Logged out successfully"
}
```

---

### GET /api/auth/me

**Purpose**: Get current admin profile

**Auth**: Required

**Response (200 OK)**:
```json
{
  "id": "uuid",
  "email": "admin@example.com",
  "created_at": "2025-12-26T10:00:00Z"
}
```

**Errors**:
- `401 Unauthorized`: Not logged in

---

## Game Management Endpoints

### POST /api/games

**Purpose**: Create new game

**Auth**: Required (admin)

**Request**: Empty body (token auto-generated)

**Response (201 Created)**:
```json
{
  "id": "uuid",
  "admin_id": "uuid",
  "token": "A3X9K2",
  "created_at": "2025-12-26T10:00:00Z"
}
```

**Errors**:
- `401 Unauthorized`: Not logged in
- `500 Internal Server Error`: Token generation failed

---

### GET /api/games

**Purpose**: List all games for current admin

**Auth**: Required (admin)

**Response (200 OK)**:
```json
{
  "games": [
    {
      "id": "uuid",
      "token": "A3X9K2",
      "created_at": "2025-12-26T10:00:00Z",
      "participant_count": 5,
      "round_count": 3
    }
  ]
}
```

---

### GET /api/games/[token]

**Purpose**: Get game details by token

**Auth**: Not required (public access via token)

**Response (200 OK)**:
```json
{
  "id": "uuid",
  "token": "A3X9K2",
  "created_at": "2025-12-26T10:00:00Z",
  "participants": [
    {
      "id": "uuid",
      "name": "João",
      "is_online": true,
      "team_id": "uuid",
      "team": {
        "id": "uuid",
        "name": "Team Red",
        "color": "#FF0000"
      }
    }
  ],
  "teams": [
    {
      "id": "uuid",
      "name": "Team Red",
      "color": "#FF0000",
      "participant_count": 3
    }
  ],
  "rounds": [
    {
      "id": "uuid",
      "status": "completed",
      "created_at": "2025-12-26T10:05:00Z"
    }
  ]
}
```

**Errors**:
- `404 Not Found`: Invalid token

---

### DELETE /api/games/[token]

**Purpose**: Delete game (admin only)

**Auth**: Required (must be game admin)

**Response (200 OK)**:
```json
{
  "message": "Game deleted successfully"
}
```

**Errors**:
- `401 Unauthorized`: Not game admin
- `404 Not Found`: Invalid token

---

## Participant Management Endpoints

### POST /api/participants

**Purpose**: Join game as participant

**Auth**: Not required

**Request**:
```json
{
  "game_token": "A3X9K2",
  "name": "João"
}
```

**Response (201 Created)**:
```json
{
  "id": "uuid",
  "game_id": "uuid",
  "name": "João",
  "avatar_seed": "João",
  "team_id": null,
  "joined_at": "2025-12-26T10:00:00Z"
}
```

**Errors**:
- `404 Not Found`: Invalid game token
- `400 Bad Request`: Invalid name (empty, too long, special characters)
- `409 Conflict`: Name already taken in this game

---

### PATCH /api/participants/[id]

**Purpose**: Update participant (e.g., assign to team)

**Auth**: Required (admin of participant's game)

**Request**:
```json
{
  "team_id": "uuid"  // or null to remove from team
}
```

**Response (200 OK)**:
```json
{
  "id": "uuid",
  "name": "João",
  "team_id": "uuid",
  "team": {
    "id": "uuid",
    "name": "Team Red",
    "color": "#FF0000"
  }
}
```

**Errors**:
- `401 Unauthorized`: Not game admin
- `404 Not Found`: Participant or team not found
- `400 Bad Request`: Team doesn't belong to same game

---

### DELETE /api/participants/[id]

**Purpose**: Remove participant from game

**Auth**: Required (admin of participant's game)

**Response (200 OK)**:
```json
{
  "message": "Participant removed successfully"
}
```

**Errors**:
- `401 Unauthorized`: Not game admin
- `404 Not Found`: Participant not found

---

## Team Management Endpoints

### POST /api/teams

**Purpose**: Create team in game

**Auth**: Required (admin of game)

**Request**:
```json
{
  "game_token": "A3X9K2",
  "name": "Team Red",
  "color": "#FF0000"
}
```

**Response (201 Created)**:
```json
{
  "id": "uuid",
  "game_id": "uuid",
  "name": "Team Red",
  "color": "#FF0000",
  "created_at": "2025-12-26T10:00:00Z"
}
```

**Errors**:
- `401 Unauthorized`: Not game admin
- `404 Not Found`: Invalid game token
- `400 Bad Request`: Invalid color format or name

---

### PATCH /api/teams/[id]

**Purpose**: Update team

**Auth**: Required (admin of team's game)

**Request**:
```json
{
  "name": "Team Blue",
  "color": "#0000FF"
}
```

**Response (200 OK)**:
```json
{
  "id": "uuid",
  "name": "Team Blue",
  "color": "#0000FF"
}
```

**Errors**:
- `401 Unauthorized`: Not game admin
- `404 Not Found`: Team not found
- `400 Bad Request`: Invalid color or name

---

### DELETE /api/teams/[id]

**Purpose**: Delete team (sets participants' team_id to null)

**Auth**: Required (admin of team's game)

**Response (200 OK)**:
```json
{
  "message": "Team deleted successfully"
}
```

**Errors**:
- `401 Unauthorized`: Not game admin
- `404 Not Found`: Team not found

---

## Round Management Endpoints

### POST /api/rounds

**Purpose**: Create new round in game

**Auth**: Required (admin of game)

**Request**:
```json
{
  "game_token": "A3X9K2",
  "participant_ids": ["uuid1", "uuid2", "uuid3"]
  // OR for team-based rounds:
  // "team_ids": ["uuid1", "uuid2"]
}
```

**Response (201 Created)**:
```json
{
  "id": "uuid",
  "game_id": "uuid",
  "status": "waiting",
  "participants": [
    {
      "id": "uuid1",
      "name": "João"
    },
    {
      "id": "uuid2",
      "name": "Maria"
    }
  ],
  "created_at": "2025-12-26T10:00:00Z"
}
```

**Errors**:
- `401 Unauthorized`: Not game admin
- `400 Bad Request`: Less than 2 participants/teams selected
- `404 Not Found`: Invalid game or participant IDs

---

### PATCH /api/rounds/[id]

**Purpose**: Update round (e.g., change participants before starting)

**Auth**: Required (admin of round's game)

**Request**:
```json
{
  "participant_ids": ["uuid1", "uuid3", "uuid4"]
}
```

**Response (200 OK)**:
```json
{
  "id": "uuid",
  "participants": [
    {
      "id": "uuid1",
      "name": "João"
    },
    {
      "id": "uuid3",
      "name": "Pedro"
    }
  ]
}
```

**Errors**:
- `401 Unauthorized`: Not game admin
- `400 Bad Request`: Round already in progress/completed
- `404 Not Found`: Round not found

---

### POST /api/rounds/[id]/start

**Purpose**: Start round (generates countdown, sends to participants via WebSocket)

**Auth**: Required (admin of round's game)

**Request**: Empty body

**Response (200 OK)**:
```json
{
  "id": "uuid",
  "status": "in_progress",
  "countdown_duration": 2350,  // milliseconds
  "started_at": "2025-12-26T10:00:00Z"
}
```

**Errors**:
- `401 Unauthorized`: Not game admin
- `400 Bad Request`: Round already started, or participants offline
- `404 Not Found`: Round not found

**Side Effects**:
- Generates random countdown (1000-5000ms)
- Updates round status to `in_progress`
- Broadcasts WebSocket event `round:started` to participants

---

### POST /api/rounds/[id]/stop

**Purpose**: Stop round manually (admin cancellation)

**Auth**: Required (admin of round's game)

**Request**: Empty body

**Response (200 OK)**:
```json
{
  "id": "uuid",
  "status": "completed",
  "completed_at": "2025-12-26T10:01:00Z",
  "result": "cancelled"
}
```

**Errors**:
- `401 Unauthorized`: Not game admin
- `400 Bad Request`: Round not in progress
- `404 Not Found`: Round not found

**Side Effects**:
- Updates round status to `completed`
- Broadcasts WebSocket event `round:cancelled` to participants

---

### POST /api/rounds/[id]/record-click

**Purpose**: Record participant click (called via WebSocket handler, not directly)

**Auth**: Not required (WebSocket-only, token-validated)

**Request**:
```json
{
  "participant_id": "uuid",
  "reaction_time": 235,  // milliseconds (null if eliminated)
  "was_eliminated": false
}
```

**Response (200 OK)**:
```json
{
  "result": {
    "id": "uuid",
    "participant_id": "uuid",
    "reaction_time": 235,
    "was_eliminated": false,
    "is_winner": false  // Determined after all participants submit
  }
}
```

**Errors**:
- `400 Bad Request`: Round not in progress
- `404 Not Found`: Round or participant not found

**Side Effects**:
- Creates `round_results` entry
- When all participants submitted, calculates winner and broadcasts `round:result`

---

### GET /api/rounds/[id]/result

**Purpose**: Get round result (winner, times)

**Auth**: Not required (public via token)

**Response (200 OK)**:
```json
{
  "round_id": "uuid",
  "status": "completed",
  "results": [
    {
      "participant": {
        "id": "uuid",
        "name": "João"
      },
      "reaction_time": 235,
      "was_eliminated": false,
      "is_winner": true
    },
    {
      "participant": {
        "id": "uuid",
        "name": "Maria"
      },
      "reaction_time": 450,
      "was_eliminated": false,
      "is_winner": false
    },
    {
      "participant": {
        "id": "uuid",
        "name": "Pedro"
      },
      "reaction_time": null,
      "was_eliminated": true,
      "is_winner": false
    }
  ],
  "winner": {
    "id": "uuid",
    "name": "João"
  }
  // OR if tie:
  // "winners": [{ "id": "uuid1", "name": "João" }, { "id": "uuid2", "name": "Ana" }]
  // OR if no winner:
  // "winner": null, "message": "All participants eliminated"
}
```

**Errors**:
- `404 Not Found`: Round not found
- `400 Bad Request`: Round not completed yet

---

## Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Optional additional context
    }
  }
}
```

**Common Error Codes**:
- `UNAUTHORIZED`: Auth required or insufficient permissions
- `NOT_FOUND`: Resource doesn't exist
- `VALIDATION_ERROR`: Invalid input data
- `CONFLICT`: Operation conflicts with current state
- `INTERNAL_ERROR`: Server error

---

## Rate Limiting

**Participant Join**: Max 10 requests per minute per IP
**Round Start**: Max 1 request per second per game
**Click Recording**: Max 1 request per participant per round

**Rate Limit Response (429 Too Many Requests)**:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later",
    "retry_after": 60  // seconds
  }
}
```
