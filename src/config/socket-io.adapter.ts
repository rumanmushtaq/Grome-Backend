import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export class SocketIOAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async connectToRedis(): Promise<void> {
    const redisHost = this.configService.get('redis.host');
    const redisPort = this.configService.get('redis.port');
    const redisPassword = this.configService.get('redis.password');
    const redisDb = this.configService.get('redis.db');

    const pubClient = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      db: redisDb,
    });

    const subClient = pubClient.duplicate();

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
