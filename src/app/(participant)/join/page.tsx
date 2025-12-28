'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ParticipantJoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [gameToken, setGameToken] = useState(tokenFromUrl);
  const [participantName, setParticipantName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gameToken.trim()) {
      setError('Game token is required');
      return;
    }

    if (!participantName.trim()) {
      setError('Your name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Join game
      const response = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_token: gameToken.trim().toUpperCase(),
          name: participantName.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to join game');
      }

      const data = await response.json();
      const participant = data.participant;

      // Store participant ID in localStorage
      localStorage.setItem('participant_id', participant.id);
      localStorage.setItem('participant_name', participant.name);
      localStorage.setItem('game_token', gameToken.trim().toUpperCase());

      // Navigate to play page
      router.push(`/(participant)/play/${gameToken.trim().toUpperCase()}`);
    } catch (err) {
      console.error('Failed to join game:', err);
      setError(err instanceof Error ? err.message : 'Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brown-dark p-6 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold text-gold-light mb-2">
            Botão da Vez
          </h1>
          <p className="text-gray-400">Join a game to start playing!</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <Input
            label="Game Token"
            type="text"
            placeholder="Enter game token (e.g., ABC123)"
            value={gameToken}
            onChange={(e) => setGameToken(e.target.value.toUpperCase())}
            maxLength={8}
            required
            helperText="Get this from your game host"
          />

          <Input
            label="Your Name"
            type="text"
            placeholder="Enter your name"
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            maxLength={50}
            required
            helperText="This is how you'll appear in the game"
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Joining...' : 'Join Game'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-sm text-gray-400 text-center">
            Don't have a game token? Ask your game host to create a game first.
          </p>
        </div>
      </Card>
    </div>
  );
}
