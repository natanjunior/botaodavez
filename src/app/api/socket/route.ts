import { NextRequest } from 'next/server';
import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@/lib/socket/types';
import { validateGameToken } from '@/lib/utils/validation';
import { handleButtonClick, handleEliminate, handleParticipantDisconnect } from '@/lib/socket/handlers/roundHandlers';

// Global Socket.io server instance
let io: Server<ClientToServerEvents, ServerToClientEvents>;

/**
 * Socket.io server initialization and handler
 * Endpoint: GET /api/socket
 *
 * Connection query params:
 * - game_token: Game token (required)
 * - participant_id: Participant UUID (optional for admin)
 * - role: 'admin' | 'participant' (required)
 */
export async function GET(req: NextRequest) {
  // Initialize Socket.io server if not already created
  if (!io) {
    const httpServer = (req as any).socket.server;

    io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    io.on('connection', (socket) => {
      const { game_token, participant_id, role } = socket.handshake.query;

      // Validate connection parameters
      if (!game_token || !role) {
        console.error('Socket connection missing required parameters');
        socket.disconnect(true);
        return;
      }

      // Validate game token format
      try {
        validateGameToken(game_token as string);
      } catch (error) {
        console.error('Invalid game token:', error);
        socket.emit('error', {
          code: 'INVALID_TOKEN',
          message: 'Invalid game token format',
        });
        socket.disconnect(true);
        return;
      }

      // Join the game room
      const roomName = `game:${game_token}`;
      socket.join(roomName);

      console.log(`[Socket.io] ${role} connected to game ${game_token}`, {
        socketId: socket.id,
        participantId: participant_id || 'admin',
      });

      // Store connection metadata
      socket.data.gameToken = game_token;
      socket.data.participantId = participant_id;
      socket.data.role = role;

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        console.log(`[Socket.io] ${role} disconnected from game ${game_token}`, {
          socketId: socket.id,
          reason,
        });

        // Emit offline status to room
        if (participant_id) {
          io.to(roomName).emit('participant:offline', {
            participant_id: participant_id as string,
            game_token: game_token as string,
          });

          // Handle disconnect during active round (auto-eliminate)
          handleParticipantDisconnect(
            participant_id as string,
            game_token as string
          );
        }
      });

      // Handle connection errors
      socket.on('error', (error) => {
        console.error(`[Socket.io] Socket error:`, error);
      });

      // Emit connection success to client
      socket.emit('connected', {
        socketId: socket.id,
        gameToken: game_token as string,
        timestamp: new Date().toISOString(),
      });

      // Notify room about new connection (if participant)
      if (role === 'participant' && participant_id) {
        socket.to(roomName).emit('participant:online', {
          participant_id: participant_id as string,
          game_token: game_token as string,
        });
      }

      // Round event handlers
      socket.on('round:button-click', (data) => {
        handleButtonClick(socket, data);
      });

      socket.on('round:eliminate', (data) => {
        handleEliminate(socket, data);
      });
    });

    console.log('[Socket.io] Server initialized');
  }

  return new Response('Socket.io server running', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

/**
 * Get Socket.io server instance
 * Used by event handlers and other parts of the application
 */
export function getSocketServer(): Server<ClientToServerEvents, ServerToClientEvents> | null {
  return io || null;
}
