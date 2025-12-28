'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Game } from '@/lib/db/schema';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load admin's games
  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/games');

      if (!response.ok) {
        throw new Error('Failed to load games');
      }

      const data = await response.json();
      setGames(data.games || []);
    } catch (err) {
      console.error('Failed to load games:', err);
      setError('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGame = async () => {
    try {
      setCreating(true);
      setError(null);

      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_type: 'button' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create game');
      }

      const data = await response.json();
      const newGame = data.game;

      // Navigate to game control page
      router.push(`/(admin)/game/${newGame.token}`);
    } catch (err) {
      console.error('Failed to create game:', err);
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGame = async (token: string) => {
    if (!confirm('Are you sure you want to delete this game? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/games/${token}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete game');
      }

      // Reload games list
      await loadGames();
    } catch (err) {
      console.error('Failed to delete game:', err);
      setError('Failed to delete game');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/(admin)/login');
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-brown-dark p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gold-light">Admin Dashboard</h1>
          <Button variant="secondary" size="small" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
            {error}
          </div>
        )}

        {/* Create new game */}
        <Card className="mb-8">
          <h2 className="text-2xl font-bold text-gold-light mb-4">Create New Game</h2>
          <p className="text-gray-300 mb-4">
            Start a new "Botão da Vez" game. Participants will be able to join using the game token.
          </p>
          <Button
            variant="primary"
            onClick={handleCreateGame}
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Create Button Game'}
          </Button>
        </Card>

        {/* Games list */}
        <div>
          <h2 className="text-2xl font-bold text-gold-light mb-4">Your Games</h2>

          {loading ? (
            <Card>
              <p className="text-gray-400">Loading games...</p>
            </Card>
          ) : games.length === 0 ? (
            <Card>
              <p className="text-gray-400">
                No games yet. Create your first game to get started!
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {games.map((game) => (
                <Card key={game.id} className="hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gold-light">
                          Game: {game.token}
                        </h3>
                        <button
                          onClick={() => copyToClipboard(game.token)}
                          className="text-sm text-gray-400 hover:text-gold-light transition-colors"
                          title="Copy token to clipboard"
                        >
                          📋 Copy
                        </button>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">
                        Type: {game.game_type} • Created:{' '}
                        {new Date(game.created_at).toLocaleString()}
                      </p>
                      <div className="flex gap-3">
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => router.push(`/(admin)/game/${game.token}`)}
                        >
                          Manage Game
                        </Button>
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => handleDeleteGame(game.token)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
