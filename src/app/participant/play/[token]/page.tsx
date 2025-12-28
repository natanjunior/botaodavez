'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AvatarWithStatus } from '@/components/shared/Avatar';
import { ReactionButton } from '@/components/participant/ReactionButton';
import { RoundStatus } from '@/components/participant/RoundStatus';
import { SpectatorView } from '@/components/participant/SpectatorView';
import { useGameParticipants, useGameRounds, useRoundResults } from '@/lib/hooks';
import type { Game, RoundParticipant } from '@/lib/db/schema';

interface GameResponse {
  game: Game;
}

export default function ParticipantPlayPage() {
  const params = useParams();
  const router = useRouter();
  const gameToken = params.token as string;

  const [game, setGame] = useState<Game | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roundParticipants, setRoundParticipants] = useState<RoundParticipant[]>([]);

  // Use Realtime hooks
  const { participants, loading: participantsLoading } = useGameParticipants(gameToken);
  const { currentRound, loading: roundsLoading } = useGameRounds(gameId);
  const { results: roundResults } = useRoundResults(currentRound?.id || null);

  // Get participant info from localStorage
  useEffect(() => {
    const storedId = localStorage.getItem('participant_id');
    const storedName = localStorage.getItem('participant_name');
    const storedToken = localStorage.getItem('game_token');

    if (!storedId || !storedName || storedToken !== gameToken) {
      // Not joined or wrong game, redirect to join page
      router.push(`/participant/join?token=${gameToken}`);
      return;
    }

    setParticipantId(storedId);
    setParticipantName(storedName);
  }, [gameToken, router]);

  // Load game
  useEffect(() => {
    if (!participantId) return;

    loadGame();
  }, [gameToken, participantId]);

  // Load round participants when round changes
  useEffect(() => {
    if (!currentRound?.id) {
      setRoundParticipants([]);
      return;
    }

    loadRoundParticipants(currentRound.id);
  }, [currentRound?.id]);

  const loadGame = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/games/${gameToken}`);

      if (!response.ok) {
        throw new Error('Game not found');
      }

      const data = (await response.json()) as GameResponse;
      setGame(data.game);
      setGameId(data.game.id);
    } catch (err) {
      console.error('Failed to load game:', err);
      setError('Failed to load game');
    } finally {
      setLoading(false);
    }
  };

  const loadRoundParticipants = async (roundId: string) => {
    try {
      const response = await fetch(`/api/rounds/${roundId}`);

      if (!response.ok) {
        return;
      }

      const data: { round: { participants: RoundParticipant[] } } = await response.json();
      setRoundParticipants(data.round.participants || []);
    } catch (err) {
      console.error('Failed to load round participants:', err);
    }
  };

  const handleLeaveGame = () => {
    if (confirm('Are you sure you want to leave the game?')) {
      localStorage.removeItem('participant_id');
      localStorage.removeItem('participant_name');
      localStorage.removeItem('game_token');
      router.push('/participant/join');
    }
  };

  // Determine participant's status in current round
  const inRound = roundParticipants.some((rp) => rp.participant_id === participantId);
  const isSpectator = currentRound && !inRound;
  const participantIdsInRound = roundParticipants.map((rp) => rp.participant_id);

  if (loading || participantsLoading || roundsLoading) {
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
          <Button variant="secondary" onClick={() => router.push('/participant/join')}>
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
        {roundResults.length > 0 && participantId && inRound ? (
          /* Show Results for Players */
          <div className="mb-6">
            <RoundStatus
              results={roundResults}
              participants={participants}
              currentParticipantId={participantId}
            />
          </div>
        ) : inRound && participantId && currentRound && currentRound.status === 'in_progress' ? (
          /* Show Reaction Button */
          <Card className="mb-6">
            <div className="flex flex-col items-center justify-center py-8">
              <h2 className="text-2xl font-bold text-gold-light mb-6">
                Get Ready!
              </h2>
              <ReactionButton
                round={currentRound}
                participantId={participantId}
              />
            </div>
          </Card>
        ) : inRound && participantId && currentRound && currentRound.status === 'waiting' ? (
          /* Waiting for round to start */
          <Card className="mb-6">
            <h2 className="text-2xl font-bold text-gold-light mb-4">
              You're in this Round!
            </h2>
            <p className="text-gray-300 mb-4">
              Waiting for the host to start the round...
            </p>
            <div className="skeu-shadow-inset p-4 bg-brown-medium rounded">
              <p className="text-center text-gray-400">
                Get ready! The button will appear when the round starts.
              </p>
            </div>
          </Card>
        ) : isSpectator && currentRound ? (
          /* Show Spectator View */
          <SpectatorView
            participantsInRound={participants.filter((p) =>
              participantIdsInRound.includes(p.id)
            )}
            allParticipants={participants}
            roundStatus={currentRound.status}
            roundResults={roundResults}
            countdownDuration={currentRound.countdown_duration}
          />
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
