import { Socket } from 'socket.io';
import { roundService } from '@/lib/services/roundService';
import { getSocketServer } from '@/app/api/socket/route';

/**
 * Round WebSocket Event Handlers
 * Handle round-related socket events
 */

/**
 * Handle round:button-click event (participant clicked green button)
 */
export async function handleButtonClick(
  socket: Socket,
  data: {
    round_id: string;
    participant_id: string;
    reaction_time: number;
  }
) {
  try {
    const { round_id, participant_id, reaction_time } = data;

    console.log('[RoundHandlers] Button click:', { round_id, participant_id, reaction_time });

    // Record reaction time
    await roundService.recordReaction({
      round_id,
      participant_id,
      reaction_time,
    });

    // Check if all participants have clicked or been eliminated
    const round = await roundService.getRoundById(round_id);
    const results = round.results || [];

    if (results.length === round.participants.length) {
      // All participants have responded - complete round
      await completeRound(round_id);
    }
  } catch (error) {
    console.error('[RoundHandlers] Error handling button click:', error);
    socket.emit('error', {
      code: 'BUTTON_CLICK_FAILED',
      message: 'Failed to record reaction time',
    });
  }
}

/**
 * Handle round:eliminate event (participant clicked yellow button)
 */
export async function handleEliminate(
  socket: Socket,
  data: {
    round_id: string;
    participant_id: string;
  }
) {
  try {
    const { round_id, participant_id } = data;

    console.log('[RoundHandlers] Participant eliminated:', { round_id, participant_id });

    // Record elimination
    await roundService.recordElimination({
      round_id,
      participant_id,
    });

    // Check if all participants have clicked or been eliminated
    const round = await roundService.getRoundById(round_id);
    const results = round.results || [];

    if (results.length === round.participants.length) {
      // All participants have responded - complete round
      await completeRound(round_id);
    }
  } catch (error) {
    console.error('[RoundHandlers] Error handling elimination:', error);
    socket.emit('error', {
      code: 'ELIMINATION_FAILED',
      message: 'Failed to record elimination',
    });
  }
}

/**
 * Complete round and broadcast results
 */
async function completeRound(round_id: string) {
  try {
    console.log('[RoundHandlers] Completing round:', round_id);

    // Complete round and determine winner(s)
    const completedRound = await roundService.completeRound(round_id);

    // Get Socket.io server
    const io = getSocketServer();
    if (!io) {
      console.error('[RoundHandlers] Socket.io server not initialized');
      return;
    }

    // Get game to find room name
    const gameId = completedRound.game_id;
    const { data: game } = await (await import('@/lib/db/supabase')).supabase
      .from('games')
      .select('token')
      .eq('id', gameId)
      .single();

    if (!game) {
      console.error('[RoundHandlers] Game not found for round:', round_id);
      return;
    }

    const roomName = `game:${game.token}`;

    // Broadcast results to all participants and admin
    io.to(roomName).emit('round:result', {
      round_id: completedRound.id,
      results: completedRound.results,
    });

    console.log(`[RoundHandlers] Round results broadcast to room ${roomName}`);
  } catch (error) {
    console.error('[RoundHandlers] Error completing round:', error);
  }
}

/**
 * Emit round:created event to participants
 */
export function emitRoundCreated(
  gameToken: string,
  roundId: string,
  participantIds: string[]
) {
  const io = getSocketServer();
  if (!io) {
    console.warn('[RoundHandlers] Socket.io server not initialized');
    return;
  }

  const roomName = `game:${gameToken}`;

  io.to(roomName).emit('round:created', {
    round_id: roundId,
    participant_ids: participantIds,
  });

  console.log(`[RoundHandlers] Emitted round:created to room ${roomName}`);
}

/**
 * Emit round:started event with countdown duration
 */
export function emitRoundStarted(
  gameToken: string,
  roundId: string,
  countdownDuration: number
) {
  const io = getSocketServer();
  if (!io) {
    console.warn('[RoundHandlers] Socket.io server not initialized');
    return;
  }

  const roomName = `game:${gameToken}`;

  io.to(roomName).emit('round:started', {
    round_id: roundId,
    countdown_duration: countdownDuration,
    server_timestamp: new Date().toISOString(),
  });

  console.log(`[RoundHandlers] Emitted round:started to room ${roomName}`, {
    roundId,
    countdownDuration,
  });
}

/**
 * Emit round:cancelled event
 */
export function emitRoundCancelled(gameToken: string, roundId: string) {
  const io = getSocketServer();
  if (!io) {
    console.warn('[RoundHandlers] Socket.io server not initialized');
    return;
  }

  const roomName = `game:${gameToken}`;

  io.to(roomName).emit('round:cancelled', {
    round_id: roundId,
  });

  console.log(`[RoundHandlers] Emitted round:cancelled to room ${roomName}`);
}
