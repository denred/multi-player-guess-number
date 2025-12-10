import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createPlayer as createPlayerApi } from '@/services/api';
import { useGameStore } from '@/store/gameStore';
import { getErrorMessage } from '@/utils/errors';
import { playerNameSchema } from '@/utils/validation';
import { useState } from 'react';

export const PlayerCreation = () => {
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { setPlayer, addLog } = useGameStore();

  const handleCreatePlayer = async () => {
    const trimmed = playerName.trim();

    const result = playerNameSchema.safeParse(trimmed);

    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setError(null);

    try {
      const player = await createPlayerApi(trimmed);
      setPlayer(player.id, player.name);
    } catch (err) {
      addLog(`Error creating player: ${getErrorMessage(err)}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Player</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex gap-3">
            <Input
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePlayer()}
              className={error ? 'border-red-500' : ''}
            />

            <Button onClick={handleCreatePlayer}>Create Player</Button>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
};
