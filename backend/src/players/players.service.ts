import { Injectable } from '@nestjs/common';
import { RedisKeys } from 'src/redis/enums/redis-keys.enums';
import { RedisService } from 'src/redis/redis.service';
import { v4 as uuidv4 } from 'uuid';
import { CreatePlayerDto } from './dtos/create-player.dto';
import { type Player } from './types/player.type';

@Injectable()
export class PlayersService {
  constructor(private readonly redis: RedisService) {}

  public async createPlayer({ name }: CreatePlayerDto): Promise<Player> {
    const id = uuidv4();

    await this.client.hSet(RedisKeys.PLAYERS, id, name);

    return { id, name };
  }

  public async getPlayer(id: string): Promise<Player | null> {
    const name = await this.client.hGet(RedisKeys.PLAYERS, id);

    if (!name) {
      return null;
    }

    return { id, name };
  }

  public async getAllPlayers(): Promise<Player[]> {
    const players = await this.client.hGetAll(RedisKeys.PLAYERS);

    return Object.entries(players).map(([id, name]) => ({
      id,
      name,
    }));
  }

  public async deletePlayer(id: string): Promise<boolean> {
    const removed = await this.client.hDel(RedisKeys.PLAYERS, id);

    await this.client.del(`${RedisKeys.PLAYER_ATTEMPTS}:${id}`);

    return removed === 1;
  }

  private get client() {
    return this.redis.getClient();
  }
}
