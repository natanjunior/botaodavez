'use client';

import { Card } from '@/components/ui/Card';
import { AvatarWithStatus } from '@/components/shared/Avatar';
import type { Participant, RoundResult } from '@/lib/db/schema';

export interface SpectatorViewProps {
  participantsInRound: Participant[];
  allParticipants: Participant[];
  roundStatus: 'waiting' | 'in_progress' | 'completed';
  roundResults: RoundResult[];
  countdownDuration?: number | null;
}

/**
 * SpectatorView Component
 * Displays round information for participants not playing in the current round
 */
export function SpectatorView({
  participantsInRound,
  allParticipants,
  roundStatus,
  roundResults,
  countdownDuration,
}: SpectatorViewProps) {
  const getParticipantById = (id: string) => {
    return allParticipants.find((p) => p.id === id);
  };

  const renderStatusMessage = () => {
    switch (roundStatus) {
      case 'waiting':
        return (
          <div className="text-center p-4 bg-brown-medium rounded">
            <p className="text-yellow-500 font-semibold">
              Round is being set up...
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Waiting for the host to start the round
            </p>
          </div>
        );

      case 'in_progress':
        return (
          <div className="text-center p-4 bg-brown-medium rounded">
            <p className="text-green-500 font-semibold animate-pulse">
              Round in Progress!
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Participants are competing...
            </p>
            {countdownDuration && (
              <p className="text-xs text-gray-500 mt-1">
                Countdown: {countdownDuration}ms
              </p>
            )}
          </div>
        );

      case 'completed':
        return null; // Results will be shown below

      default:
        return null;
    }
  };

  const renderResults = () => {
    if (roundStatus !== 'completed' || roundResults.length === 0) {
      return null;
    }

    const winners = roundResults.filter((r) => r.is_winner);
    const eliminated = roundResults.filter((r) => r.was_eliminated);
    const validResults = roundResults
      .filter((r) => !r.was_eliminated)
      .sort((a, b) => {
        if (a.reaction_time === null) return 1;
        if (b.reaction_time === null) return -1;
        return a.reaction_time - b.reaction_time;
      });

    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gold-light">Round Complete!</h3>

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
            {validResults.map((result, index) => {
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
                      result.is_winner
                        ? 'text-gold-light font-bold'
                        : 'text-gray-300'
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
      </div>
    );
  };

  return (
    <Card className="mb-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gold-light mb-2">
            Spectator View
          </h2>
          <p className="text-gray-400">
            You're not playing in this round, but you can watch!
          </p>
        </div>

        {/* Status Message */}
        {renderStatusMessage()}

        {/* Participants in Round */}
        {roundStatus !== 'completed' && participantsInRound.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-300 mb-3">
              Playing Now ({participantsInRound.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {participantsInRound.map((participant) => (
                <div
                  key={participant.id}
                  className="flex flex-col items-center gap-2 p-3 bg-brown-medium rounded"
                >
                  <AvatarWithStatus
                    seed={participant.name}
                    size={48}
                    isOnline={participant.is_online}
                  />
                  <p className="text-sm text-white text-center truncate max-w-[80px]">
                    {participant.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {renderResults()}
      </div>
    </Card>
  );
}
