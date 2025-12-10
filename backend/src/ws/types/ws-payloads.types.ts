import { GuessResult } from 'src/game/enums/guess-result.enum';
import { PlayerInfo, Room } from 'src/game/types/game.types';

export type PlayerConnectedPayload = {
  playerId: string;
};

export type GuessSubmitPayload = {
  playerId: string;
  guess: number;
  roomId: string;
};

export type GuessResultPayload = {
  playerId: string;
  result: GuessResult;
  winner?: string;
};

export type GameFinishedPayload = {
  winner: string;
  winnerName: string;
  totalAttempts: number;
};

export type PlayerGuessBroadcastPayload = {
  playerId: string;
  playerName: string;
  guess?: number;
  result: GuessResult | string;
  timestamp: string;
};

export type GameStateUpdatePayload = {
  activePlayers: PlayerInfo[];
  totalGuesses: number;
  gameStatus: string;
  currentTurnPlayerId?: string;
  roomId?: string;
};

export type PlayerJoinedPayload = {
  playerId: string;
  totalPlayers: number;
};

export type PlayerLeftPayload = {
  playerId: string;
  totalPlayers: number;
};

export type CreateRoomPayload = {
  playerId: string;
};

export type JoinRoomPayload = {
  roomId: string;
  playerId: string;
};

export type SetReadyPayload = {
  roomId: string;
  playerId: string;
  isReady: boolean;
};

export type StartGamePayload = {
  roomId: string;
};

export type RoomStateUpdatePayload = {
  room: Room;
  players: PlayerInfo[];
  readyPlayers: string[];
  currentTurnPlayerId?: string;
  totalGuesses?: number;
};

export type ConnectedPlayer = {
  playerId: string;
  roomId?: string;
};
