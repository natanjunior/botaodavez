import { NextRequest } from 'next/server';
import { Server } from 'socket.io';

let io: Server;

export async function GET(req: NextRequest) {
  if (!io) {
    // Inicializa Socket.io server
    const httpServer = (req as any).socket.server;
    io = new Server(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
    });

    io.on('connection', (socket) => {
      const { game_token, participant_id, role } = socket.handshake.query;

      // Entrar na room do game
      socket.join(game_token as string);

      console.log(`${role} conectado ao game ${game_token}`);

      // Eventos do participante
      socket.on('participant:heartbeat', (data) => {
        // TODO: Atualizar last_seen no banco
        console.log('Heartbeat recebido:', data);
      });

      socket.on('round:button-click', (data) => {
        // TODO: Registrar clique e determinar vencedor
        console.log('Botão clicado:', data);
      });

      socket.on('round:eliminate', (data) => {
        // TODO: Marcar participante como eliminado
        console.log('Participante eliminado:', data);
      });

      socket.on('disconnect', () => {
        // TODO: Marcar participante como offline
        console.log(`${role} desconectado do game ${game_token}`);
      });
    });
  }

  return new Response('Socket.io server running', { status: 200 });
}
