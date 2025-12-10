import { useGameStore } from '@/store/gameStore';
import { GameRoom } from './GameRoom';
import { PlayerCreation } from './PlayerCreation';
import { RoomList } from './RoomList';

const AppContent = () => {
  const { yourId, currentRoom } = useGameStore();

  if (!yourId) {
    return <PlayerCreation />;
  }

  if (!currentRoom) {
    return <RoomList />;
  }

  return <GameRoom />;
};

export default AppContent;
