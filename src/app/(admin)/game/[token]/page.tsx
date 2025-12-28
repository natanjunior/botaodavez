'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GameDashboard } from '@/components/admin/GameDashboard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Game } from '@/lib/db/schema';

export default function GameControlPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load game details
  useEffect(() => {
    loadGame();
  }, [token]);

  const loadGame = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/games/${token}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Game not found');
        }
        throw new Error('Failed to load game');
      }

      const data = await response.json();
      setGame(data.game);
    } catch (err) {
      console.error('Failed to load game:', err);
      setError(err instanceof Error ? err.message : 'Failed to load game');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    router.push('/(admin)/dashboard');
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
          <Button variant="secondary" onClick={handleBackToDashboard}>
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brown-dark p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gold-light mb-1">
              Game Control: {token}
            </h1>
            <p className="text-gray-400">
              Type: {game.game_type} • Created:{' '}
              {new Date(game.created_at).toLocaleString()}
            </p>
          </div>
          <Button variant="secondary" size="small" onClick={handleBackToDashboard}>
            Back to Dashboard
          </Button>
        </div>

        {/* Game Dashboard Component */}
        <GameDashboard gameToken={token} />
      </div>
    </div>
  );
}
