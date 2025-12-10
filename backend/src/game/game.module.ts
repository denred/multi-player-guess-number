import { Module } from '@nestjs/common';
import { PlayersModule } from 'src/players/players.module';
import { RedisModule } from 'src/redis/redis.module';
import { GameController } from './game.controller';
import { GameService } from './services/game.service';
import { RoomService } from './services/room.service';

@Module({
  imports: [RedisModule, PlayersModule],
  controllers: [GameController],
  providers: [GameService, RoomService],
  exports: [GameService, RoomService],
})
export class GameModule {}
