import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GameModule } from './game/game.module';
import { PlayersModule } from './players/players.module';
import { RedisModule } from './redis/redis.module';
import { WsGateway } from './ws/ws.gateway';
import { WsModule } from './ws/ws.module';

@Module({
  imports: [GameModule, RedisModule, PlayersModule, WsModule, ConfigModule],
  providers: [WsGateway],
})
export class AppModule {}
