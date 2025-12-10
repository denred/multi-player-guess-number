import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PlayersService } from 'src/players/players.service';
import { RedisKeys } from 'src/redis/enums/redis-keys.enums';
import { RedisService } from 'src/redis/redis.service';
import { v4 as uuidv4 } from 'uuid';
import { GameStatus } from '../enums/game-status.enum';
import { Room, RoomState } from '../types/game.types';
import { RoomKeys } from '../utils/room-keys.util';

@Injectable()
export class RoomService {
  private readonly logger = new Logger(RoomService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly playersService: PlayersService,
  ) {}

  private get client() {
    return this.redisService.getClient();
  }

  public async createRoom(creatorId: string): Promise<Room> {
    const roomId = uuidv4();
    const room: Room = {
      id: roomId,
      status: GameStatus.WAITING,
      createdAt: new Date().toISOString(),
      playerIds: [creatorId],
    };

    await Promise.all([
      this.client.hSet(RedisKeys.ROOMS, roomId, JSON.stringify(room)),
      this.client.sAdd(RoomKeys.players(roomId), creatorId),
      this.client.set(RoomKeys.status(roomId), GameStatus.WAITING),
    ]);

    return room;
  }

  public async joinRoom(roomId: string, playerId: string): Promise<void> {
    const roomData = await this.client.hGet(RedisKeys.ROOMS, roomId);

    if (!roomData) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }

    const room: Room = JSON.parse(roomData);
    const roomStatus = await this.client.get(RoomKeys.status(roomId));

    if (roomStatus === GameStatus.ACTIVE) {
      throw new BadRequestException('Cannot join: Game already started');
    }

    await Promise.all([
      this.client.sAdd(RoomKeys.players(roomId), playerId),
      this.client.hSet(
        RedisKeys.ROOMS,
        roomId,
        JSON.stringify({ ...room, playerIds: [...room.playerIds, playerId] }),
      ),
    ]);
  }

  public async setPlayerReady(
    roomId: string,
    playerId: string,
    isReady: boolean,
  ): Promise<void> {
    const roomData = await this.client.hGet(RedisKeys.ROOMS, roomId);

    if (!roomData) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }

    const isInRoom = await this.client.sIsMember(
      RoomKeys.players(roomId),
      playerId,
    );

    if (!isInRoom) {
      throw new BadRequestException('Player is not in this room');
    }

    await (isReady
      ? this.client.sAdd(RoomKeys.ready(roomId), playerId)
      : this.client.sRem(RoomKeys.ready(roomId), playerId));
  }

  public async areAllPlayersReady(roomId: string): Promise<boolean> {
    const [playerIds, readyPlayerIds] = await Promise.all([
      this.client.sMembers(RoomKeys.players(roomId)),
      this.client.sMembers(RoomKeys.ready(roomId)),
    ]);

    return playerIds.length >= 2 && playerIds.length === readyPlayerIds.length;
  }

  public async getRoomState(roomId: string): Promise<RoomState> {
    const roomData = await this.client.hGet(RedisKeys.ROOMS, roomId);

    if (!roomData) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }

    const room: Room = JSON.parse(roomData);

    const [playerIds, readyPlayerIds, currentTurn, roomStatus] =
      await Promise.all([
        this.client.sMembers(RoomKeys.players(roomId)),
        this.client.sMembers(RoomKeys.ready(roomId)),
        this.client.get(RoomKeys.turn(roomId)),
        this.client.get(RoomKeys.status(roomId)),
      ]);

    const players = await this.resolvePlayers(playerIds);

    return {
      room: {
        ...room,
        playerIds,
        status: (roomStatus as GameStatus) || room.status,
      },
      players,
      readyPlayers: readyPlayerIds,
      currentTurnPlayerId: currentTurn ?? undefined,
    };
  }

  public async getAllRooms(): Promise<Room[]> {
    const roomsData = await this.client.hGetAll(RedisKeys.ROOMS);
    const rooms: Room[] = [];

    await Promise.all(
      Object.entries(roomsData).map(async ([roomId, roomStr]) => {
        const room: Room = JSON.parse(roomStr);
        const playerIds = await this.client.sMembers(RoomKeys.players(room.id));
        rooms.push({ ...room, playerIds });
      }),
    );

    return rooms;
  }

  public async removePlayerFromRoom(
    roomId: string,
    playerId: string,
  ): Promise<void> {
    const roomData = await this.client.hGet(RedisKeys.ROOMS, roomId);

    if (!roomData) {
      return;
    }

    const room: Room = JSON.parse(roomData);

    await Promise.all([
      this.client.sRem(RoomKeys.players(roomId), playerId),
      this.client.sRem(RoomKeys.ready(roomId), playerId),
      this.client.hSet(
        RedisKeys.ROOMS,
        roomId,
        JSON.stringify({
          ...room,
          playerIds: room.playerIds.filter((id) => id !== playerId),
        }),
      ),
    ]);
  }

  public async deleteRoomIfEmpty(roomId: string): Promise<boolean> {
    const playerIds = await this.client.sMembers(RoomKeys.players(roomId));

    if (playerIds.length > 0) {
      return false;
    }

    const attempts = await this.client.keys(
      RoomKeys.roomPlayerAttempts(roomId),
    );

    await Promise.all([
      this.client.keys(RoomKeys.roomPlayerAttempts(roomId)),
      this.client.hDel(RedisKeys.ROOMS, roomId),
      this.client.del(RoomKeys.players(roomId)),
      this.client.del(RoomKeys.ready(roomId)),
      this.client.del(RoomKeys.status(roomId)),
      this.client.del(RoomKeys.secret(roomId)),
      this.client.del(RoomKeys.order(roomId)),
      this.client.del(RoomKeys.turn(roomId)),
      ...attempts.map((key) => this.client.del(key)),
    ]);

    return true;
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
