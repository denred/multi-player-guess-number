export type PlayerInfo = {
  id: string;
  name: string;
};

export type Room = {
  id: string;
  status: string;
  createdAt: string;
  playerIds: string[];
};

export type RoomState = {
  room: Room;
  players: PlayerInfo[];
  readyPlayers: string[];
  currentTurnPlayerId?: string;
  totalGuesses?: number;
};

export type GameState = {
  activePlayers: PlayerInfo[];
  totalGuesses: number;
  gameStatus: string;
  currentTurnPlayerId?: string;
  roomId?: string;
};
