'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AvatarWithStatus } from '@/components/shared/Avatar';
import { RoundControls } from '@/components/admin/RoundControls';
import { useGameParticipants } from '@/lib/hooks';
import type { Team } from '@/lib/db/schema';

export interface GameDashboardProps {
  gameToken: string;
}

export function GameDashboard({ gameToken }: GameDashboardProps) {
  // Use Realtime hook for participants
  const { participants, loading, error: participantsError } = useGameParticipants(gameToken);

  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load teams
  useEffect(() => {
    loadTeams();
  }, [gameToken]);

  // Update error state
  useEffect(() => {
    setError(participantsError);
  }, [participantsError]);

  const loadTeams = async () => {
    try {
      const response = await fetch(`/api/teams?game_token=${gameToken}`);

      if (!response.ok) {
        throw new Error('Failed to load teams');
      }

      const data = await response.json();
      setTeams(data.teams || []);
    } catch (err) {
      console.error('Failed to load teams:', err);
    }
  };

  const handleKickParticipant = async (participantId: string) => {
    if (!confirm('Are you sure you want to kick this participant?')) {
      return;
    }

    try {
      const response = await fetch(`/api/participants/${participantId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to kick participant');
      }

      // Realtime will automatically update the participants list
    } catch (err) {
      console.error('Failed to kick participant:', err);
      setError('Failed to kick participant');
    }
  };

  const getParticipantTeam = (participantId: string): Team | undefined => {
    return teams.find((team) =>
      participants.some(
        (p) => p.id === participantId && p.team_id === team.id
      )
    );
  };

  const getOnlineCount = () => {
    return participants.filter((p) => p.is_online).length;
  };

  const getParticipantsByTeam = (teamId: string | null) => {
    return participants.filter((p) => p.team_id === teamId);
  };

  const unassignedParticipants = getParticipantsByTeam(null);

  return (
    <div className="space-y-6">
      {/* Game Info */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold text-gold-light">Game Information</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-gray-300">
            <div>
              <span className="text-gray-400">Game Token:</span>
              <span className="ml-2 font-mono text-gold-light">{gameToken}</span>
              <button
                onClick={() => navigator.clipboard.writeText(gameToken)}
                className="ml-2 text-sm text-gray-400 hover:text-gold-light"
              >
                📋
              </button>
            </div>
            <div>
              <span className="text-gray-400">Participants Online:</span>
              <span className="ml-2 font-bold text-gold-light">
                {getOnlineCount()} / {participants.length}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Teams:</span>
              <span className="ml-2 font-bold text-gold-light">{teams.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Join URL:</span>
              <span className="ml-2 font-mono text-sm text-gray-400">
                {typeof window !== 'undefined' &&
                  `${window.location.origin}/participant/join?token=${gameToken}`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
          {error}
        </div>
      )}

      {/* Participants List */}
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold text-gold-light">
            Participants ({participants.length})
          </h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-400">Loading participants...</p>
          ) : participants.length === 0 ? (
            <p className="text-gray-400">
              No participants yet. Share the game token for participants to join!
            </p>
          ) : (
            <div className="space-y-4">
              {/* Unassigned Participants */}
              {unassignedParticipants.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-3">
                    Unassigned Participants
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {unassignedParticipants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center gap-3 p-3 bg-brown-medium rounded skeu-shadow-inset"
                      >
                        <AvatarWithStatus
                          seed={participant.name}
                          size={48}
                          isOnline={participant.is_online}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">
                            {participant.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {participant.is_online ? 'Online' : 'Offline'}
                          </p>
                        </div>
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => handleKickParticipant(participant.id)}
                        >
                          Kick
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Teams */}
              {teams.map((team) => {
                const teamParticipants = getParticipantsByTeam(team.id);
                if (teamParticipants.length === 0) return null;

                return (
                  <div key={team.id}>
                    <h3
                      className="text-lg font-semibold mb-3"
                      style={{ color: team.color }}
                    >
                      Team: {team.name} ({teamParticipants.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {teamParticipants.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center gap-3 p-3 rounded skeu-shadow-inset"
                          style={{ backgroundColor: `${team.color}20` }}
                        >
                          <AvatarWithStatus
                            seed={participant.name}
                            size={48}
                            isOnline={participant.is_online}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">
                              {participant.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {participant.is_online ? 'Online' : 'Offline'}
                            </p>
                          </div>
                          <Button
                            variant="danger"
                            size="small"
                            onClick={() => handleKickParticipant(participant.id)}
                          >
                            Kick
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Round Controls */}
      <RoundControls gameToken={gameToken} participants={participants} />
    </div>
  );
}
