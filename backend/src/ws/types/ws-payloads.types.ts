import { GuessResult } from 'src/game/enums/guess-result.enum';

export type PlayerConnectedPayload = {
  playerId: string;
};

export type GuessSubmitPayload = {
  playerId: string;
  guess: number;
};

export type GuessResultPayload = {
  playerId: string;
  result: GuessResult;
  winner?: string;
};

export type GameFinishedPayload = {
  winner: string;
  totalAttempts: number;
};

export type PlayerGuessBroadcastPayload = {
  playerId: string;
  guess: number;
  result: GuessResult;
  timestamp: string;
};

export type GameStateUpdatePayload = {
  activePlayers: string[];
  totalGuesses: number;
  gameStatus: string;
};

export type PlayerJoinedPayload = {
  playerId: string;
  totalPlayers: number;
};

export type PlayerLeftPayload = {
  playerId: string;
  totalPlayers: number;
};
