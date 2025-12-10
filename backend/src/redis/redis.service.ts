import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  private readonly client: RedisClientType;
  private readonly pub: RedisClientType;
  private readonly sub: RedisClientType;

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.get<string>('REDIS_URL');

    this.client = createClient({ url: redisUrl });
    this.pub = createClient({ url: redisUrl });
    this.sub = createClient({ url: redisUrl });

    this.client.on('error', (err) =>
      this.logger.error('Redis Client Error', err),
    );
    this.pub.on('error', (err) => this.logger.error('Redis Pub Error', err));
    this.sub.on('error', (err) => this.logger.error('Redis Sub Error', err));
  }

  public async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      await this.pub.connect();
      await this.sub.connect();

      this.logger.log('Redis connected successfully');
    } catch (err) {
      this.logger.error('Redis connection failed', err);
      throw err;
    }
  }

  public async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing Redis connections');

    await Promise.allSettled([
      this.client.quit(),
      this.pub.quit(),
      this.sub.quit(),
    ]);

    this.logger.log('Redis connections closed');
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const res = await this.client.ping();
      return res === 'PONG';
    } catch (err) {
      this.logger.error('Redis health check failed', err);
      return false;
    }
  }

  public getClient(): RedisClientType {
    return this.client;
  }

  public getPublisher(): RedisClientType {
    return this.pub;
  }

  public getSubscriber(): RedisClientType {
    return this.sub;
  }
}
