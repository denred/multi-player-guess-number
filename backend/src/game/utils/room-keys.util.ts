import { RedisKeys } from 'src/redis/enums/redis-keys.enums';

export const RoomKeys = {
  status: (roomId: string) => `${RedisKeys.ROOM_STATUS}:${roomId}`,
  secret: (roomId: string) => `${RedisKeys.ROOM_SECRET}:${roomId}`,
  players: (roomId: string) => `${RedisKeys.ROOM_PLAYERS}:${roomId}`,
  ready: (roomId: string) => `${RedisKeys.ROOM_READY_PLAYERS}:${roomId}`,
  order: (roomId: string) => `${RedisKeys.ROOM_PLAYER_ORDER}:${roomId}`,
  turn: (roomId: string) => `${RedisKeys.ROOM_CURRENT_TURN}:${roomId}`,
  attempts: (roomId: string, playerId: string) =>
    `${RedisKeys.ROOM_PLAYER_ATTEMPTS}:${roomId}:${playerId}`,
  playerAttempts: (playerId: string) =>
    `${RedisKeys.PLAYER_ATTEMPTS}:${playerId}`,
  attemptsAll: `${RedisKeys.ROOM_PLAYER_ATTEMPTS}:*`,
  roomPlayerAttempts: (roomId: string) =>
    `${RedisKeys.ROOM_PLAYER_ATTEMPTS}:${roomId}:*`,
};
