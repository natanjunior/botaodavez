/**
 * Presence Handlers for Socket.io
 * Manages participant online/offline status and heartbeat
 */

import { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../types';
import { supabase } from '@/lib/db/supabase';

/**
 * Heartbeat timeout duration (milliseconds)
 * If no heartbeat received within this time, mark participant as offline
 */
const HEARTBEAT_TIMEOUT = 30000; // 30 seconds

/**
 * Map to store heartbeat timers for each participant
 * Key: participant_id, Value: NodeJS.Timeout
 */
const heartbeatTimers = new Map<string, NodeJS.Timeout>();

/**
 * Setup presence handlers for a socket connection
 * @param io - Socket.io server instance
 * @param socket - Connected socket
 */
export function setupPresenceHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>
) {
  const { gameToken, participantId, role } = socket.data;

  if (!gameToken) {
    console.error('[Presence] Missing game token in socket data');
    return;
  }

  const roomName: `game:${string}` = `game:${gameToken}`;

  // Handle participant heartbeat
  socket.on('participant:heartbeat', async (data) => {
    const { participant_id, timestamp } = data;

    if (!participant_id) {
      console.error('[Presence] Heartbeat missing participant_id');
      return;
    }

    try {
      // Update last_seen timestamp in database
      const { error } = await supabase
        .from('participants')
        .update({
          last_seen: new Date().toISOString(),
          is_online: true,
        })
        .eq('id', participant_id);

      if (error) {
        console.error('[Presence] Failed to update heartbeat:', error);
        return;
      }

      // Calculate latency for monitoring
      const latency = Date.now() - timestamp;
      console.log(`[Presence] Heartbeat from ${participant_id}, latency: ${latency}ms`);

      // Reset heartbeat timeout timer
      resetHeartbeatTimer(io, participant_id, gameToken);
    } catch (error) {
      console.error('[Presence] Error handling heartbeat:', error);
    }
  });

  // Setup initial heartbeat timer for this participant
  if (participantId && role === 'participant') {
    setupHeartbeatTimer(io, participantId, gameToken);
  }

  // Handle disconnect - mark participant as offline
  socket.on('disconnect', async () => {
    if (participantId && role === 'participant') {
      try {
        // Update database
        await supabase
          .from('participants')
          .update({
            is_online: false,
            last_seen: new Date().toISOString(),
          })
          .eq('id', participantId);

        // Clear heartbeat timer
        clearHeartbeatTimer(participantId);

        // Emit offline event to room
        io.to(roomName).emit('participant:offline', {
          participant_id: participantId,
          game_token: gameToken,
        });

        console.log(`[Presence] Participant ${participantId} marked offline`);
      } catch (error) {
        console.error('[Presence] Error handling disconnect:', error);
      }
    }
  });
}

/**
 * Setup heartbeat timeout timer for a participant
 * If no heartbeat received within HEARTBEAT_TIMEOUT, mark as offline
 *
 * @param io - Socket.io server instance
 * @param participantId - Participant UUID
 * @param gameToken - Game token
 */
function setupHeartbeatTimer(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  participantId: string,
  gameToken: string
) {
  const timer = setTimeout(async () => {
    console.log(`[Presence] Heartbeat timeout for participant ${participantId}`);

    try {
      // Mark participant as offline in database
      await supabase
        .from('participants')
        .update({
          is_online: false,
          last_seen: new Date().toISOString(),
        })
        .eq('id', participantId);

      // Emit offline event to game room
      const roomName: `game:${string}` = `game:${gameToken}`;
      io.to(roomName).emit('participant:offline', {
        participant_id: participantId,
        game_token: gameToken,
      });

      // Clear timer from map
      heartbeatTimers.delete(participantId);
    } catch (error) {
      console.error('[Presence] Error handling heartbeat timeout:', error);
    }
  }, HEARTBEAT_TIMEOUT);

  heartbeatTimers.set(participantId, timer);
}

/**
 * Reset heartbeat timer for a participant (called when heartbeat received)
 *
 * @param io - Socket.io server instance
 * @param participantId - Participant UUID
 * @param gameToken - Game token
 */
function resetHeartbeatTimer(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  participantId: string,
  gameToken: string
) {
  // Clear existing timer
  clearHeartbeatTimer(participantId);

  // Setup new timer
  setupHeartbeatTimer(io, participantId, gameToken);
}

/**
 * Clear heartbeat timer for a participant
 *
 * @param participantId - Participant UUID
 */
function clearHeartbeatTimer(participantId: string) {
  const timer = heartbeatTimers.get(participantId);
  if (timer) {
    clearTimeout(timer);
    heartbeatTimers.delete(participantId);
  }
}

/**
 * Get all active heartbeat timers (for debugging/monitoring)
 *
 * @returns Map of participant IDs to their heartbeat timers
 */
export function getActiveHeartbeats(): Map<string, NodeJS.Timeout> {
  return heartbeatTimers;
}

/**
 * Clear all heartbeat timers (for cleanup/shutdown)
 */
export function clearAllHeartbeatTimers() {
  heartbeatTimers.forEach((timer) => clearTimeout(timer));
  heartbeatTimers.clear();
  console.log('[Presence] All heartbeat timers cleared');
}
