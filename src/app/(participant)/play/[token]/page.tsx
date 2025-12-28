'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AvatarWithStatus } from '@/components/shared/Avatar';
import { ReactionButton } from '@/components/participant/ReactionButton';
import { RoundStatus } from '@/components/participant/RoundStatus';
import type { Participant, Game, RoundResult } from '@/lib/db/schema';

export default function ParticipantPlayPage() {
  const params = useParams();
  const router = useRouter();
  const gameToken = params.token as string;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState<string | null>(null);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [inRound, setInRound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get participant info from localStorage
  useEffect(() => {
    const storedId = localStorage.getItem('participant_id');
    const storedName = localStorage.getItem('participant_name');
    const storedToken = localStorage.getItem('game_token');

    if (!storedId || !storedName || storedToken !== gameToken) {
      // Not joined or wrong game, redirect to join page
      router.push(`/(participant)/join?token=${gameToken}`);
      return;
    }

    setParticipantId(storedId);
    setParticipantName(storedName);
  }, [gameToken, router]);

  // Load game and participants
  useEffect(() => {
    if (!participantId) return;

    loadGame();
    loadParticipants();
  }, [gameToken, participantId]);

  // Initialize Socket.io connection
  useEffect(() => {
    if (!participantId) return;

    const newSocket = io({
      path: '/api/socket',
      query: {
        game_token: gameToken,
        participant_id: participantId,
        role: 'participant',
      },
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[ParticipantPlay] Connected to Socket.io');
    });

    newSocket.on('participant:joined', (data) => {
      console.log('[ParticipantPlay] Participant joined:', data);
      loadParticipants();
    });

    newSocket.on('participant:online', (data) => {
      console.log('[ParticipantPlay] Participant online:', data);
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === data.participant_id ? { ...p, is_online: true } : p
        )
      );
    });

    newSocket.on('participant:offline', (data) => {
      console.log('[ParticipantPlay] Participant offline:', data);
      setParticipants((prev) =>
        prev.map((p) =>
          p.id === data.participant_id ? { ...p, is_online: false } : p
        )
      );
    });

    // Round events
    newSocket.on('round:created', (data) => {
      console.log('[ParticipantPlay] Round created:', data);
      if (data.participant_ids.includes(participantId)) {
        setCurrentRoundId(data.round_id);
        setInRound(true);
        setRoundResults([]);
      }
    });

    newSocket.on('round:started', (data) => {
      console.log('[ParticipantPlay] Round started:', data);
    });

    newSocket.on('round:cancelled', (data) => {
      console.log('[ParticipantPlay] Round cancelled:', data);
      setCurrentRoundId(null);
      setInRound(false);
      setRoundResults([]);
    });

    newSocket.on('round:result', (data) => {
      console.log('[ParticipantPlay] Round result:', data);
      setRoundResults(data.results);
    });

    // Heartbeat to maintain connection
    const heartbeatInterval = setInterval(() => {
      newSocket.emit('participant:heartbeat', {
        participant_id: participantId,
      });
    }, 10000); // Every 10 seconds

    // Cleanup
    return () => {
      clearInterval(heartbeatInterval);
      newSocket.close();
    };
  }, [gameToken, participantId]);

  const loadGame = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/games/${gameToken}`);

      if (!response.ok) {
        throw new Error('Game not found');
      }

      const data = await response.json();
      setGame(data.game);
    } catch (err) {
      console.error('Failed to load game:', err);
      setError('Failed to load game');
    }
  };

  const loadParticipants = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/participants?game_token=${gameToken}`);

      if (!response.ok) {
        throw new Error('Failed to load participants');
      }

      const data = await response.json();
      setParticipants(data.participants || []);
    } catch (err) {
      console.error('Failed to load participants:', err);
      setError('Failed to load participants');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGame = () => {
    if (confirm('Are you sure you want to leave the game?')) {
      localStorage.removeItem('participant_id');
      localStorage.removeItem('participant_name');
      localStorage.removeItem('game_token');
      router.push('/(participant)/join');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brown-dark p-6 flex items-center justify-center">
        <Card>
          <p className="text-gray-400">Loading game...</p>
        </Card>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-brown-dark p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <h2 className="text-xl font-bold text-red-500 mb-4">Error</h2>
          <p className="text-gray-300 mb-6">{error || 'Game not found'}</p>
          <Button variant="secondary" onClick={() => router.push('/(participant)/join')}>
            Join Another Game
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brown-dark p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gold-light mb-1">
              {game.game_type === 'button' ? 'Botão da Vez' : 'Game'}
            </h1>
            <p className="text-gray-400">
              Welcome, {participantName}! • Game: {gameToken}
            </p>
          </div>
          <Button variant="danger" size="small" onClick={handleLeaveGame}>
            Leave Game
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
            {error}
          </div>
        )}

        {/* Round Area */}
        {roundResults.length > 0 && participantId ? (
          /* Show Results */
          <div className="mb-6">
            <RoundStatus
              results={roundResults}
              participants={participants}
              currentParticipantId={participantId}
            />
          </div>
        ) : inRound && participantId ? (
          /* Show Reaction Button */
          <Card className="mb-6">
            <div className="flex flex-col items-center justify-center py-8">
              <h2 className="text-2xl font-bold text-gold-light mb-6">
                Get Ready!
              </h2>
              <ReactionButton
                socket={socket}
                roundId={currentRoundId}
                participantId={participantId}
              />
            </div>
          </Card>
        ) : (
          /* Waiting for Round */
          <Card className="mb-6">
            <h2 className="text-2xl font-bold text-gold-light mb-4">
              Waiting for Round
            </h2>
            <p className="text-gray-300 mb-4">
              The game host will start the round when everyone is ready.
            </p>
            <div className="skeu-shadow-inset p-4 bg-brown-medium rounded">
              <p className="text-center text-gray-400">
                Round controls will appear here when the host starts a round
              </p>
            </div>
          </Card>
        )}

        {/* Participants List */}
        <Card>
          <h2 className="text-2xl font-bold text-gold-light mb-4">
            Participants ({participants.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className={`
                  flex flex-col items-center gap-2 p-3 rounded
                  ${participant.id === participantId ? 'bg-gold-500/20 border-2 border-gold-500' : 'bg-brown-medium'}
                `}
              >
                <AvatarWithStatus
                  seed={participant.name}
                  size={60}
                  isOnline={participant.is_online}
                />
                <div className="text-center">
                  <p className="font-medium text-white truncate max-w-[100px]">
                    {participant.name}
                  </p>
                  {participant.id === participantId && (
                    <p className="text-xs text-gold-light">(You)</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
