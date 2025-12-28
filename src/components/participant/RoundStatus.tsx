'use client';

import { Card } from '@/components/ui/Card';
import { AvatarWithStatus } from '@/components/shared/Avatar';
import type { RoundResult, Participant } from '@/lib/db/schema';

export interface RoundStatusProps {
  results: RoundResult[];
  participants: Participant[];
  currentParticipantId: string;
}

/**
 * RoundStatus Component
 * Displays round results for participants
 */
export function RoundStatus({
  results,
  participants,
  currentParticipantId,
}: RoundStatusProps) {
  if (results.length === 0) {
    return null;
  }

  const getParticipantById = (id: string) => {
    return participants.find((p) => p.id === id);
  };

  const currentParticipantResult = results.find(
    (r) => r.participant_id === currentParticipantId
  );

  const winners = results.filter((r) => r.is_winner);
  const eliminated = results.filter((r) => r.was_eliminated);
  const validResults = results.filter((r) => !r.was_eliminated).sort((a, b) => {
    if (a.reaction_time === null) return 1;
    if (b.reaction_time === null) return -1;
    return a.reaction_time - b.reaction_time;
  });

  return (
    <Card className="max-w-2xl mx-auto">
      <div className="space-y-6">
        {/* Your Result */}
        {currentParticipantResult && (
          <div>
            {currentParticipantResult.is_winner && (
              <div className="text-center p-6 bg-gold-500/20 border-2 border-gold-500 rounded mb-4">
                <h2 className="text-4xl font-bold text-gold-light mb-2">
                  🏆 You Won! 🏆
                </h2>
                <p className="text-2xl text-white">
                  {currentParticipantResult.reaction_time}ms
                </p>
              </div>
            )}

            {currentParticipantResult.was_eliminated && (
              <div className="text-center p-6 bg-red-900/30 border-2 border-red-500 rounded mb-4">
                <h2 className="text-2xl font-bold text-red-400 mb-2">
                  Eliminated
                </h2>
                <p className="text-gray-300">
                  You clicked too early! Wait for green next time.
                </p>
              </div>
            )}

            {!currentParticipantResult.is_winner && !currentParticipantResult.was_eliminated && (
              <div className="text-center p-4 bg-brown-medium rounded mb-4">
                <h3 className="text-xl font-semibold text-gray-300 mb-1">
                  Your Time
                </h3>
                <p className="text-2xl text-gold-light font-mono">
                  {currentParticipantResult.reaction_time}ms
                </p>
              </div>
            )}
          </div>
        )}

        {/* Winners */}
        {winners.length > 0 && (
          <div>
            <h3 className="text-xl font-bold text-gold-light mb-3">
              {winners.length > 1 ? 'Winners (Tie!)' : 'Winner'}
            </h3>
            <div className="space-y-2">
              {winners.map((winner) => {
                const participant = getParticipantById(winner.participant_id);
                const isCurrentParticipant = winner.participant_id === currentParticipantId;

                return (
                  <div
                    key={winner.id}
                    className={`
                      flex items-center justify-between p-4 rounded
                      ${
                        isCurrentParticipant
                          ? 'bg-gold-500/30 border-2 border-gold-500'
                          : 'bg-gold-500/10 border border-gold-500'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <AvatarWithStatus
                        seed={participant?.name || 'Unknown'}
                        size={48}
                        isOnline={participant?.is_online || false}
                      />
                      <div>
                        <p className="font-semibold text-white">
                          {participant?.name}
                          {isCurrentParticipant && ' (You)'}
                        </p>
                        <p className="text-sm text-gold-light">Winner!</p>
                      </div>
                    </div>
                    <p className="text-2xl font-mono font-bold text-gold-light">
                      {winner.reaction_time}ms
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All Results */}
        <div>
          <h3 className="text-lg font-semibold text-gray-300 mb-3">All Results</h3>
          <div className="space-y-2">
            {validResults.map((result, index) => {
              const participant = getParticipantById(result.participant_id);
              const isCurrentParticipant = result.participant_id === currentParticipantId;
              const isWinner = result.is_winner;

              return (
                <div
                  key={result.id}
                  className={`
                    flex items-center justify-between p-3 rounded
                    ${
                      isCurrentParticipant
                        ? 'bg-brown-light border border-gold-500'
                        : 'bg-brown-medium'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 font-mono w-8 text-center">
                      {index + 1}.
                    </span>
                    <AvatarWithStatus
                      seed={participant?.name || 'Unknown'}
                      size={40}
                      isOnline={participant?.is_online || false}
                    />
                    <div>
                      <p className="font-medium text-white">
                        {participant?.name}
                        {isCurrentParticipant && ' (You)'}
                      </p>
                      {isWinner && (
                        <p className="text-xs text-gold-light">Winner</p>
                      )}
                    </div>
                  </div>
                  <p
                    className={`font-mono text-lg ${
                      isWinner ? 'text-gold-light font-bold' : 'text-gray-300'
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
            <h3 className="text-lg font-semibold text-red-400 mb-3">Eliminated</h3>
            <div className="space-y-2">
              {eliminated.map((result) => {
                const participant = getParticipantById(result.participant_id);
                const isCurrentParticipant = result.participant_id === currentParticipantId;

                return (
                  <div
                    key={result.id}
                    className={`
                      flex items-center gap-3 p-3 rounded
                      ${
                        isCurrentParticipant
                          ? 'bg-red-900/40 border border-red-500'
                          : 'bg-red-900/20'
                      }
                    `}
                  >
                    <AvatarWithStatus
                      seed={participant?.name || 'Unknown'}
                      size={36}
                      isOnline={participant?.is_online || false}
                    />
                    <div className="flex-1">
                      <p className="text-gray-300">
                        {participant?.name}
                        {isCurrentParticipant && ' (You)'}
                      </p>
                      <p className="text-xs text-red-400">Clicked too early</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
