import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { socketService } from '@/services/socket.service';
import { useGameStore } from '@/store/gameStore';
import type { Room } from '@/types/game.types';
import { formatRoomId } from '@/utils/formatters';

export const RoomList = () => {
  const { yourId, yourName, availableRooms } = useGameStore();

  const handleCreateRoom = () => socketService.createRoom(yourId);
  const handleJoinRoom = (roomId: string) => socketService.joinRoom(roomId, yourId);
  const handleRefreshRooms = () => socketService.getRooms();

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {yourName}!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleCreateRoom} className="w-full">
            Create New Room
          </Button>
          <Button onClick={handleRefreshRooms} variant="outline" className="w-full">
            Refresh Rooms
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Rooms ({availableRooms.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {availableRooms.length === 0 ? (
            <p className="text-sm text-gray-500">No rooms available. Create one!</p>
          ) : (
            <div className="space-y-2">
              {availableRooms.map((room: Room) => (
                <div key={room.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">Room {formatRoomId(room.id)}...</p>
                    <p className="text-sm text-gray-500">
                      {room.playerIds.length} player(s) ·{' '}
                      <Badge variant="outline">{room.status}</Badge>
                    </p>
                  </div>
                  <Button onClick={() => handleJoinRoom(room.id)} size="sm">
                    Join
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
