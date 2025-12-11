import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PlayersService } from 'src/players/players.service';
import { RedisKeys } from 'src/redis/enums/redis-keys.enums';
import { RedisService } from 'src/redis/redis.service';
import { GameConfig } from '../config/game.config';
import { GameStatus } from '../enums/game-status.enum';
import { GuessResult } from '../enums/guess-result.enum';
import { GameState, PlayerGuess } from '../types/game.types';
import { GuessResponse } from '../types/guess-response.types';
import { RoomKeys } from '../utils/room-keys.util';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly playersService: PlayersService,
  ) {}

  public async startGame(): Promise<GameState> {
    const secret = this.generateSecret();

    const [attemptKeys] = await Promise.all([
      this.client.keys(RoomKeys.attemptsAll),
      this.client.set(RedisKeys.GAME_SECRET, secret.toString()),
      this.client.set(RedisKeys.GAME_STATUS, GameStatus.ACTIVE),
      this.client.del(RedisKeys.GAME_HISTORY),
      this.client.del(RedisKeys.ACTIVE_PLAYERS),
    ]);

    if (attemptKeys?.length) {
      await this.client.del(attemptKeys);
    }

    this.logger.log(`Game started with secret number: ${secret}`);

    return {
      status: GameStatus.ACTIVE,
      activePlayers: [],
      totalGuesses: 0,
    };
  }

  public async getGameState(): Promise<GameState> {
    const [secretRaw, statusRaw, activePlayerIds, historyRaw] =
      await Promise.all([
        this.client.get(RedisKeys.GAME_SECRET),
        this.client.get(RedisKeys.GAME_STATUS),
        this.client.sMembers(RedisKeys.ACTIVE_PLAYERS),
        this.client.lRange(RedisKeys.GAME_HISTORY, 0, -1),
      ]);

    const status = statusRaw as GameStatus | null;

    if (!secretRaw || !status) {
      return {
        status: GameStatus.INACTIVE,
        activePlayers: [],
        totalGuesses: 0,
      };
    }

    const activePlayers = await this.resolvePlayers(activePlayerIds);

    return {
      secret: Number(secretRaw),
      status,
      activePlayers,
      totalGuesses: historyRaw.length,
    };
  }

  public async guess(playerId: string, guess: number): Promise<GuessResponse> {
    const [secretRaw, statusRaw] = await Promise.all([
      this.client.get(RedisKeys.GAME_SECRET),
      this.client.get(RedisKeys.GAME_STATUS),
    ]);

    const status = statusRaw as GameStatus | null;

    this.ensureGameActive(status);
    this.ensureGameNotFinished(status);

    const secret = Number(secretRaw);

    await Promise.all([
      this.client.sAdd(RedisKeys.ACTIVE_PLAYERS, playerId),
      this.client.lPush(RoomKeys.playerAttempts(playerId), guess.toString()),
    ]);

    const result = this.evaluateGuess(guess, secret);
    await this.recordGuessHistory(playerId, guess, result);

    if (result === GuessResult.CORRECT) {
      return this.handleCorrectGuess(playerId);
    }

    return { result };
  }

  public async addActivePlayer(playerId: string): Promise<string[]> {
    await this.client.sAdd(RedisKeys.ACTIVE_PLAYERS, playerId);

    return this.client.sMembers(RedisKeys.ACTIVE_PLAYERS);
  }

  public async removeActivePlayer(playerId: string): Promise<string[]> {
    await this.client.sRem(RedisKeys.ACTIVE_PLAYERS, playerId);

    return this.client.sMembers(RedisKeys.ACTIVE_PLAYERS);
  }

  public async getActivePlayers(): Promise<string[]> {
    return this.client.sMembers(RedisKeys.ACTIVE_PLAYERS);
  }

  public async getGameHistory(): Promise<PlayerGuess[]> {
    const historyRaw = await this.client.lRange(RedisKeys.GAME_HISTORY, 0, -1);

    return historyRaw.map((item) => this.parseGuess(item));
  }

  private generateSecret(): number {
    return (
      Math.floor(
        Math.random() * (GameConfig.MAX_NUMBER - GameConfig.MIN_NUMBER + 1),
      ) + GameConfig.MIN_NUMBER
    );
  }

  private parseGuess(raw: string): PlayerGuess {
    const parsed = JSON.parse(raw) as PlayerGuess;

    return {
      playerId: parsed.playerId,
      guess: Number(parsed.guess),
      result: parsed.result,
      timestamp: parsed.timestamp,
    };
  }

  private async finishGame(winnerId: string): Promise<void> {
    await Promise.all([
      this.client.set(RedisKeys.GAME_STATUS, GameStatus.FINISHED),
      this.client.del(RedisKeys.ACTIVE_PLAYERS),
    ]);

    const attemptKeys = await this.client.keys(RoomKeys.attemptsAll);

    if (attemptKeys.length > 0) {
      await this.client.del(attemptKeys);
    }

    this.logger.log(`Game finished! Winner: ${winnerId}`);
  }

  public async startGameInRoom(roomId: string): Promise<GameState> {
    const [roomStatus, playerIds, readyPlayerIds] = await Promise.all([
      this.client.get(RoomKeys.status(roomId)),
      this.client.sMembers(RoomKeys.players(roomId)),
      this.client.sMembers(`${RedisKeys.ROOM_READY_PLAYERS}:${roomId}`),
    ]);

    if (roomStatus === GameStatus.ACTIVE) {
      throw new BadRequestException('Game already started');
    }

    if (playerIds.length < 2) {
      throw new BadRequestException('At least 2 players required');
    }

    if (playerIds.length !== readyPlayerIds.length) {
      throw new BadRequestException('All players must be ready');
    }

    const secret = this.generateSecret();

    await Promise.all([
      this.client.set(`${RedisKeys.ROOM_SECRET}:${roomId}`, secret.toString()),
      this.client.set(RoomKeys.status(roomId), GameStatus.ACTIVE),

      this.client.del(`${RedisKeys.ROOM_PLAYER_ORDER}:${roomId}`),
      this.client.del(RoomKeys.turn(roomId)),

      this.client.rPush(`${RedisKeys.ROOM_PLAYER_ORDER}:${roomId}`, playerIds),
      this.client.set(RoomKeys.turn(roomId), playerIds[0]),
    ]);

    this.logger.log(`Game started in room ${roomId}, secret: ${secret}`);

    const activePlayers = await this.resolvePlayers(playerIds);

    return {
      status: GameStatus.ACTIVE,
      activePlayers,
      totalGuesses: 0,
      currentTurnPlayerId: playerIds[0],
      roomId,
    };
  }

  public async getGameStateForRoom(roomId: string): Promise<GameState> {
    const [status, playerIds, currentTurn] = await Promise.all([
      this.client.get(RoomKeys.status(roomId)),
      this.client.sMembers(RoomKeys.players(roomId)),
      this.client.get(RoomKeys.turn(roomId)),
    ]);

    if (!status) {
      return {
        status: GameStatus.WAITING,
        activePlayers: [],
        totalGuesses: 0,
        roomId,
      };
    }

    const activePlayers = await this.resolvePlayers(playerIds);

    return {
      status: this.parseRoomStatus(status),
      activePlayers,
      totalGuesses: 0,
      currentTurnPlayerId: currentTurn ?? undefined,
      roomId,
    };
  }

  public async guessInRoom(
    roomId: string,
    playerId: string,
    guess: number,
  ): Promise<GuessResponse> {
    const [secretRaw, statusRaw, currentTurn] = await Promise.all([
      this.client.get(RoomKeys.secret(roomId)),
      this.client.get(RoomKeys.status(roomId)),
      this.client.get(RoomKeys.turn(roomId)),
    ]);

    const status = statusRaw as GameStatus | null;

    if (status === GameStatus.FINISHED) {
      throw new BadRequestException('Game is already finished');
    }

    if (!secretRaw || !status || status === GameStatus.WAITING) {
      throw new BadRequestException('Game has not started');
    }

    if (currentTurn && currentTurn !== playerId) {
      throw new BadRequestException('Not your turn');
    }

    const secret = Number(secretRaw);
    await this.client.lPush(
      RoomKeys.attempts(roomId, playerId),
      guess.toString(),
    );

    const result = this.evaluateGuess(guess, secret);

    const playerGuess: PlayerGuess = {
      playerId,
      guess,
      result,
      timestamp: new Date().toISOString(),
    };

    await this.client.lPush(
      RedisKeys.GAME_HISTORY,
      JSON.stringify(playerGuess),
    );

    if (result === GuessResult.CORRECT) {
      await this.finishGameInRoom(roomId, playerId);
      const totalAttempts = await this.client.lLen(
        RoomKeys.attempts(roomId, playerId),
      );
      return { result: GuessResult.CORRECT, winner: playerId, totalAttempts };
    }

    await this.nextTurnInRoom(roomId);
    return { result };
  }

  private get client() {
    return this.redisService.getClient();
  }

  private async nextTurnInRoom(roomId: string): Promise<void> {
    const playerOrder = await this.client.lRange(RoomKeys.order(roomId), 0, -1);

    if (playerOrder.length === 0) {
      return;
    }

    const currentTurn = await this.client.get(RoomKeys.turn(roomId));

    if (!currentTurn) {
      await this.client.set(RoomKeys.turn(roomId), playerOrder[0]);
      return;
    }

    const currentIndex = playerOrder.indexOf(currentTurn);
    const nextIndex = (currentIndex + 1) % playerOrder.length;
    await this.client.set(RoomKeys.turn(roomId), playerOrder[nextIndex]);
  }

  private async finishGameInRoom(
    roomId: string,
    winnerId: string,
  ): Promise<void> {
    const client = this.redisService.getClient();
    await client.set(RoomKeys.status(roomId), GameStatus.FINISHED);
    this.logger.log(`Game in room ${roomId} finished! Winner: ${winnerId}`);
  }

  private ensureGameActive(status: GameStatus | null) {
    if (!status || status === GameStatus.INACTIVE) {
      throw new BadRequestException('Game has not started');
    }
  }

  private ensureGameNotFinished(status: GameStatus | null) {
    if (status === GameStatus.FINISHED) {
      throw new BadRequestException('Game is already finished');
    }
  }

  private evaluateGuess(guess: number, secret: number): GuessResult {
    if (guess === secret) return GuessResult.CORRECT;
    return guess < secret ? GuessResult.HIGHER : GuessResult.LOWER;
  }

  private async handleCorrectGuess(playerId: string): Promise<GuessResponse> {
    await this.finishGame(playerId);

    const totalAttempts = await this.client.lLen(RedisKeys.GAME_HISTORY);

    return {
      result: GuessResult.CORRECT,
      winner: playerId,
      totalAttempts,
    };
  }

  private async recordGuessHistory(
    playerId: string,
    guess: number,
    result: GuessResult,
  ) {
    const entry = JSON.stringify({
      playerId,
      guess,
      result,
      timestamp: new Date().toISOString(),
    });

    await this.client.lPush(RedisKeys.GAME_HISTORY, entry);
  }

  private parseRoomStatus(raw: string | null): GameStatus {
    if (Object.values(GameStatus).includes(raw as GameStatus)) {
      return raw as GameStatus;
    }

    return GameStatus.WAITING;
  }

  private async resolvePlayers(ids: string[]) {
    return Promise.all(
      ids.map(
        async (id) =>
          (await this.playersService.getPlayer(id)) ?? { id, name: 'Unknown' },
      ),
    );
  }
}
