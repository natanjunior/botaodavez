'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AvatarWithStatus } from '@/components/shared/Avatar';
import type { Participant, Round, RoundResult } from '@/lib/db/schema';

export interface RoundControlsProps {
  gameToken: string;
  participants: Participant[];
}

export function RoundControls({ gameToken, participants }: RoundControlsProps) {
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [playCount, setPlayCount] = useState(1);

  // Initialize Socket.io for round events
  useEffect(() => {
    const newSocket = io({
      path: '/api/socket',
      query: {
        game_token: gameToken,
        role: 'admin',
      },
    });

    setSocket(newSocket);

    newSocket.on('round:result', (data) => {
      console.log('[RoundControls] Round result received:', data);
      setRoundResults(data.results);
      setCurrentRound((prev) => prev ? { ...prev, status: 'completed' } : null);
    });

    return () => {
      newSocket.close();
    };
  }, [gameToken]);

  const handleParticipantToggle = (participantId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(participantId)
        ? prev.filter((id) => id !== participantId)
        : [...prev, participantId]
    );
  };

  const handleCreateRound = async () => {
    if (selectedParticipants.length < 2) {
      setError('Select at least 2 participants for a round');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_token: gameToken,
          participant_ids: selectedParticipants,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create round');
      }

      const data = await response.json();
      setCurrentRound(data.round);
      setRoundResults([]);
      // Keep play count when replaying with same participants
    } catch (err) {
      console.error('Failed to create round:', err);
      setError(err instanceof Error ? err.message : 'Failed to create round');
    } finally {
      setLoading(false);
    }
  };

  const handleStartRound = async () => {
    if (!currentRound) return;

    // Validate all selected participants are online
    const selectedOnline = participants.filter(
      (p) => selectedParticipants.includes(p.id) && p.is_online
    );

    if (selectedOnline.length < selectedParticipants.length) {
      setError('All selected participants must be online to start the round');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/rounds/${currentRound.id}/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start round');
      }

      const data = await response.json();
      setCurrentRound(data.round);
    } catch (err) {
      console.error('Failed to start round:', err);
      setError(err instanceof Error ? err.message : 'Failed to start round');
    } finally {
      setLoading(false);
    }
  };

  const handleStopRound = async () => {
    if (!currentRound) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/rounds/${currentRound.id}/stop`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to stop round');
      }

      const data = await response.json();
      setCurrentRound(data.round);
      setRoundResults([]);
    } catch (err) {
      console.error('Failed to stop round:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop round');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAgain = () => {
    setCurrentRound(null);
    setRoundResults([]);
    setError(null);
    setPlayCount((prev) => prev + 1);
  };

  const onlineParticipants = participants.filter((p) => p.is_online);

  const getParticipantById = (id: string) => {
    return participants.find((p) => p.id === id);
  };

  const renderRoundStatus = () => {
    if (!currentRound) {
      return (
        <p className="text-gray-400">
          Select participants and create a round to begin
        </p>
      );
    }

    if (currentRound.status === 'waiting') {
      return (
        <div className="space-y-4">
          <div>
            <p className="text-gold-light font-semibold">
              Round created! Click "Jogar" to start.
            </p>
            {playCount > 1 && (
              <p className="text-sm text-gray-400 mt-1">
                Replay #{playCount}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={handleStartRound}
              disabled={loading}
            >
              {loading ? 'Starting...' : 'Jogar'}
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={handlePlayAgain}
            >
              Cancel Round
            </Button>
          </div>
        </div>
      );
    }

    if (currentRound.status === 'in_progress') {
      return (
        <div className="space-y-4">
          <div>
            <p className="text-gold-light font-semibold animate-pulse">
              Round in progress... Participants are playing!
            </p>
            {playCount > 1 && (
              <p className="text-sm text-gray-400 mt-1">
                Replay #{playCount}
              </p>
            )}
          </div>
          <p className="text-sm text-gray-400">
            Countdown: {currentRound.countdown_duration}ms
          </p>
          <Button
            variant="danger"
            size="small"
            onClick={handleStopRound}
            disabled={loading}
          >
            Parar Rodada
          </Button>
        </div>
      );
    }

    if (currentRound.status === 'completed' && roundResults.length > 0) {
      const winners = roundResults.filter((r) => r.is_winner);
      const eliminated = roundResults.filter((r) => r.was_eliminated);
      const participants = roundResults.filter((r) => !r.was_eliminated);

      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-2xl font-bold text-gold-light">Round Complete!</h3>
            {playCount > 1 && (
              <p className="text-sm text-gray-400 mt-1">
                Replay #{playCount}
              </p>
            )}
          </div>

          {/* Winners */}
          {winners.length > 0 && (
            <div className="p-4 bg-gold-500/20 border border-gold-500 rounded">
              <h4 className="font-semibold text-gold-light mb-2">
                {winners.length > 1 ? 'Winners (Tie!)' : 'Winner'}
              </h4>
              {winners.map((winner) => {
                const participant = getParticipantById(winner.participant_id);
                return (
                  <div key={winner.id} className="flex items-center gap-3 mb-2">
                    <AvatarWithStatus
                      seed={participant?.name || 'Unknown'}
                      size={40}
                      isOnline={participant?.is_online || false}
                    />
                    <div>
                      <p className="font-medium text-white">{participant?.name}</p>
                      <p className="text-sm text-gold-light">
                        {winner.reaction_time}ms
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* All Results */}
          <div>
            <h4 className="font-semibold text-gray-300 mb-2">All Results</h4>
            <div className="space-y-2">
              {participants.map((result, index) => {
                const participant = getParticipantById(result.participant_id);
                return (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-2 bg-brown-medium rounded"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 font-mono w-6">
                        {index + 1}.
                      </span>
                      <AvatarWithStatus
                        seed={participant?.name || 'Unknown'}
                        size={32}
                        isOnline={participant?.is_online || false}
                      />
                      <p className="text-white">{participant?.name}</p>
                    </div>
                    <p
                      className={`font-mono ${
                        result.is_winner ? 'text-gold-light font-bold' : 'text-gray-300'
                      }`}
                    >
                      {result.reaction_time}ms
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Eliminated Participants */}
          {eliminated.length > 0 && (
            <div>
              <h4 className="font-semibold text-red-400 mb-2">Eliminated</h4>
              <div className="space-y-1">
                {eliminated.map((result) => {
                  const participant = getParticipantById(result.participant_id);
                  return (
                    <div
                      key={result.id}
                      className="flex items-center gap-3 p-2 bg-red-900/20 rounded"
                    >
                      <AvatarWithStatus
                        seed={participant?.name || 'Unknown'}
                        size={32}
                        isOnline={participant?.is_online || false}
                      />
                      <p className="text-gray-300">{participant?.name}</p>
                      <span className="text-sm text-red-400">
                        (clicked too early)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Play Again Button */}
          <Button variant="primary" onClick={handlePlayAgain}>
            Jogar Outra Vez
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-2xl font-bold text-gold-light">Round Controls</h2>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
            {error}
          </div>
        )}

        {/* Participant Selection (only show if no current round) */}
        {!currentRound && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-300 mb-3">
              Select Participants ({selectedParticipants.length} selected)
            </h3>

            {onlineParticipants.length === 0 ? (
              <p className="text-gray-400">
                No online participants. Wait for participants to join.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {onlineParticipants.map((participant) => (
                  <button
                    key={participant.id}
                    onClick={() => handleParticipantToggle(participant.id)}
                    className={`
                      p-3 rounded border-2 transition-all
                      ${
                        selectedParticipants.includes(participant.id)
                          ? 'border-gold-500 bg-gold-500/20'
                          : 'border-gray-600 bg-brown-medium hover:border-gray-500'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <AvatarWithStatus
                        seed={participant.name}
                        size={48}
                        isOnline={participant.is_online}
                      />
                      <p className="text-sm text-white truncate max-w-[80px]">
                        {participant.name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Round Button */}
        {!currentRound && (
          <Button
            variant="primary"
            onClick={handleCreateRound}
            disabled={loading || selectedParticipants.length < 2}
          >
            {loading ? 'Creating...' : 'Create Round'}
          </Button>
        )}

        {/* Round Status */}
        {renderRoundStatus()}
      </CardContent>
    </Card>
  );
}
