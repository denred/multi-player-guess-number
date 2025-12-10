import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RedisKeys } from 'src/redis/enums/redis-keys.enums';
import { RedisService } from 'src/redis/redis.service';
import { GameConfig } from './config/game.config';
import { GameStatus } from './enums/game-status.enum';
import { GuessResult } from './enums/guess-result.enum';
import { GameState, PlayerGuess } from './types/game.types';
import { GuessResponse } from './types/guess-response.types';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(private readonly redisService: RedisService) {}

  public async startGame(): Promise<GameState> {
    const client = this.redisService.getClient();
    const secret = this.generateSecret();

    await client.set(RedisKeys.GAME_SECRET, secret.toString());
    await client.set(RedisKeys.GAME_STATUS, GameStatus.ACTIVE);

    await client.del(RedisKeys.GAME_HISTORY);
    await client.del(RedisKeys.ACTIVE_PLAYERS);

    const attemptKeys = await client.keys(`${RedisKeys.PLAYER_ATTEMPTS}:*`);

    if (attemptKeys.length > 0) {
      await client.del(attemptKeys);
    }

    this.logger.log(`Game started with secret number: ${secret}`);

    return {
      status: GameStatus.ACTIVE,
      activePlayers: [],
      totalGuesses: 0,
    };
  }

  public async getGameState(): Promise<GameState> {
    const client = this.redisService.getClient();

    const [secretRaw, statusRaw, activePlayers, historyRaw] = await Promise.all(
      [
        client.get(RedisKeys.GAME_SECRET),
        client.get(RedisKeys.GAME_STATUS),
        client.sMembers(RedisKeys.ACTIVE_PLAYERS),
        client.lRange(RedisKeys.GAME_HISTORY, 0, -1),
      ],
    );

    const status = statusRaw as GameStatus | null;

    if (!secretRaw || !status) {
      return {
        status: GameStatus.INACTIVE,
        activePlayers: [],
        totalGuesses: 0,
      };
    }

    return {
      secret: Number(secretRaw),
      status,
      activePlayers,
      totalGuesses: historyRaw.length,
    };
  }

  public async guess(playerId: string, guess: number): Promise<GuessResponse> {
    const client = this.redisService.getClient();

    const [secretRaw, statusRaw] = await Promise.all([
      client.get(RedisKeys.GAME_SECRET),
      client.get(RedisKeys.GAME_STATUS),
    ]);

    const status = statusRaw as GameStatus | null;

    if (!secretRaw || !status || status === GameStatus.INACTIVE) {
      throw new BadRequestException('Game has not started');
    }

    if (status === GameStatus.FINISHED) {
      throw new BadRequestException('Game is already finished');
    }

    const secret = Number(secretRaw);

    await client.sAdd(RedisKeys.ACTIVE_PLAYERS, playerId);

    await client.lPush(
      `${RedisKeys.PLAYER_ATTEMPTS}:${playerId}`,
      guess.toString(),
    );

    let result: GuessResult;

    if (guess === secret) {
      result = GuessResult.CORRECT;
    } else if (guess < secret) {
      result = GuessResult.HIGHER;
    } else {
      result = GuessResult.LOWER;
    }

    const playerGuess: PlayerGuess = {
      playerId,
      guess,
      result,
      timestamp: new Date().toISOString(),
    };

    await client.lPush(RedisKeys.GAME_HISTORY, JSON.stringify(playerGuess));

    this.logger.log(
      `Guess from player=${playerId}: guess=${guess}, result=${result}`,
    );

    if (result === GuessResult.CORRECT) {
      await this.finishGame(playerId);

      const totalAttempts = await client.lLen(RedisKeys.GAME_HISTORY);

      return {
        result: GuessResult.CORRECT,
        winner: playerId,
        totalAttempts,
      };
    }

    return { result };
  }

  public async addActivePlayer(playerId: string): Promise<string[]> {
    const client = this.redisService.getClient();
    await client.sAdd(RedisKeys.ACTIVE_PLAYERS, playerId);

    return await client.sMembers(RedisKeys.ACTIVE_PLAYERS);
  }

  public async removeActivePlayer(playerId: string): Promise<string[]> {
    const client = this.redisService.getClient();
    await client.sRem(RedisKeys.ACTIVE_PLAYERS, playerId);

    return await client.sMembers(RedisKeys.ACTIVE_PLAYERS);
  }

  public async getActivePlayers(): Promise<string[]> {
    const client = this.redisService.getClient();

    return await client.sMembers(RedisKeys.ACTIVE_PLAYERS);
  }

  public async getGameHistory(): Promise<PlayerGuess[]> {
    const client = this.redisService.getClient();
    const historyRaw = await client.lRange(RedisKeys.GAME_HISTORY, 0, -1);

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
    const client = this.redisService.getClient();

    await client.set(RedisKeys.GAME_STATUS, GameStatus.FINISHED);
    await client.del(RedisKeys.ACTIVE_PLAYERS);

    const attemptKeys = await client.keys(`${RedisKeys.PLAYER_ATTEMPTS}:*`);

    if (attemptKeys.length > 0) {
      await client.del(attemptKeys);
    }

    this.logger.log(`Game finished! Winner: ${winnerId}`);
  }
}
