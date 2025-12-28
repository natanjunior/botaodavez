import { getSocketServer } from '@/app/api/socket/route';
import type { Team } from '@/lib/db/schema';

/**
 * Team WebSocket Event Emitters
 * Emit real-time events for team changes
 */

/**
 * Emit when a team is created
 */
export function emitTeamCreated(gameToken: string, team: Team): void {
  const io = getSocketServer();
  if (!io) {
    console.warn('[TeamEvents] Socket.io server not initialized');
    return;
  }

  const roomName = `game:${gameToken}`;

  io.to(roomName).emit('team:created', {
    team: {
      id: team.id,
      game_id: team.game_id,
      name: team.name,
      color: team.color,
      created_at: team.created_at,
    },
  });

  console.log(`[TeamEvents] Emitted team:created to room ${roomName}`, team.id);
}

/**
 * Emit when a team is updated
 */
export function emitTeamUpdated(gameToken: string, team: Team): void {
  const io = getSocketServer();
  if (!io) {
    console.warn('[TeamEvents] Socket.io server not initialized');
    return;
  }

  const roomName = `game:${gameToken}`;

  io.to(roomName).emit('team:updated', {
    team: {
      id: team.id,
      game_id: team.game_id,
      name: team.name,
      color: team.color,
      updated_at: team.updated_at,
    },
  });

  console.log(`[TeamEvents] Emitted team:updated to room ${roomName}`, team.id);
}

/**
 * Emit when a team is deleted
 */
export function emitTeamDeleted(gameToken: string, teamId: string): void {
  const io = getSocketServer();
  if (!io) {
    console.warn('[TeamEvents] Socket.io server not initialized');
    return;
  }

  const roomName = `game:${gameToken}`;

  io.to(roomName).emit('team:deleted', {
    team_id: teamId,
  });

  console.log(`[TeamEvents] Emitted team:deleted to room ${roomName}`, teamId);
}

/**
 * Emit when participants are assigned to a team
 */
export function emitTeamParticipantsUpdated(
  gameToken: string,
  teamId: string,
  participantIds: string[]
): void {
  const io = getSocketServer();
  if (!io) {
    console.warn('[TeamEvents] Socket.io server not initialized');
    return;
  }

  const roomName = `game:${gameToken}`;

  io.to(roomName).emit('team:participants-assigned', {
    team_id: teamId,
    participant_ids: participantIds,
  });

  console.log(
    `[TeamEvents] Emitted team:participants-assigned to room ${roomName}`,
    { teamId, count: participantIds.length }
  );
}
