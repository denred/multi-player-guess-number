import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { socketService } from '@/services/socket.service';
import { useGameStore } from '@/store/gameStore';
import { RoomStatus } from '@/types/room.types';
import { getErrorMessage } from '@/utils/errors';
import { formatRoomId, isBot } from '@/utils/formatters';
import { guessSchema } from '@/utils/validation';
import { Target } from 'lucide-react';
import { useState } from 'react';

export const GameRoom = () => {
  const { yourId, currentRoom, gameState, addLog, reset } = useGameStore();
  const [guess, setGuess] = useState('');
  const [guessError, setGuessError] = useState('');

  if (!currentRoom) {
    return null;
  }

  const isYourTurn = gameState?.currentTurnPlayerId === yourId;
  const isReady = currentRoom.readyPlayers.includes(yourId);
  const isWaiting = currentRoom.room.status === RoomStatus.WAITING;
  const isActive = currentRoom.room.status === RoomStatus.ACTIVE;
  const isFinished = currentRoom.room.status === RoomStatus.FINISHED;
  const canStartGame = currentRoom.players.length >= 2;

  const handleSetReady = () => {
    socketService.setReady(currentRoom.room.id, yourId);
  };

  const handleAddBot = () => {
    socketService.addBot(currentRoom.room.id);
  };

  const handleRemoveBot = (botId: string) => {
    socketService.removeBot(currentRoom.room.id, botId);
  };

  const handleLeaveRoom = () => {
    socketService.leaveRoom(yourId, currentRoom.room.id);
    reset();
  };

  const handleSubmitGuess = () => {
    if (!isYourTurn) return;

    const validation = guessSchema.safeParse(guess);
    if (!validation.success) {
      setGuessError(getErrorMessage(validation.error));
      return;
    }

    setGuessError('');
    socketService.submitGuess(yourId, Number(guess), currentRoom.room.id);
    addLog(`You guessed: ${guess}`);
    setGuess('');
  };

  const currentTurnPlayerName =
    currentRoom.players.find((p) => p.id === gameState?.currentTurnPlayerId)?.name ||
    'other player';

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>
            Room: {formatRoomId(currentRoom.room.id)}... ·{' '}
            <Badge variant="secondary">{currentRoom.room.status}</Badge>
          </CardTitle>
          <Button onClick={handleLeaveRoom} variant="outline" size="sm">
            Leave Room
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Players ({currentRoom.players.length}):</h3>
          <div className="space-y-2">
            {currentRoom.players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className={
                      player.id === yourId
                        ? 'flex items-center gap-2 font-bold shrink-0'
                        : 'flex items-center gap-2 shrink-0'
                    }
                  >
                    <span className="whitespace-nowrap">
                      {player.name} {player.id === yourId && '(You)'}
                    </span>
                    {gameState?.currentTurnPlayerId === player.id && (
                      <Target size={16} className="text-blue-500 shrink-0" />
                    )}
                  </div>
                  {currentRoom.readyPlayers.includes(player.id) && (
                    <Badge variant="outline" className="shrink-0">
                      Ready ✓
                    </Badge>
                  )}
                </div>
                {isBot(player.name) && isWaiting && (
                  <Button
                    onClick={() => handleRemoveBot(player.id)}
                    size="sm"
                    variant="destructive"
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {isWaiting && (
          <div className="space-y-2">
            {!isReady ? (
              <Button onClick={handleSetReady} className="w-full" disabled={!canStartGame}>
                Ready {!canStartGame && '(Need at least 2 players)'}
              </Button>
            ) : (
              <p className="text-sm text-gray-500 text-center">
                ✓ You are ready. Waiting for other players...
              </p>
            )}
            <Button onClick={handleAddBot} variant="outline" className="w-full">
              Add Bot
            </Button>
          </div>
        )}

        {isActive && (
          <div className="space-y-4">
            <Separator />
            <div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Guess a number 1-100"
                    value={guess}
                    onChange={(e) => {
                      setGuess(e.target.value);
                      setGuessError('');
                    }}
                    disabled={!isYourTurn || isFinished}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && isYourTurn && !isFinished && handleSubmitGuess()
                    }
                  />
                  {guessError && <p className="text-sm text-red-500 mt-1">{guessError}</p>}
                </div>
                <Button onClick={handleSubmitGuess} disabled={!isYourTurn || isFinished}>
                  Submit
                </Button>
              </div>
            </div>
            {!isYourTurn && (
              <p className="text-sm text-gray-500 text-center">
                Waiting for {currentTurnPlayerName}'s turn...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
