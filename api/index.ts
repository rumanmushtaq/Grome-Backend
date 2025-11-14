import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cors from 'cors';
import { AppModule } from '../src/app.module';
import { Logger } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';

let cachedApp: express.Application;

async function createApp(): Promise<express.Application> {
  if (cachedApp) {
    return cachedApp;
  }

  try {
    const expressApp = express();
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      {
        logger: ['error', 'warn', 'log'],
      },
    );

    const configService = app.get(ConfigService);
    const logger = new Logger('Bootstrap');

    // Security middleware
    app.use(helmet());
    app.use(compression());
    app.use(
      cors({
        origin: configService.get('CORS_ORIGIN')?.split(',') || ['*'],
        credentials: true,
      }),
    );

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Global prefix
    app.setGlobalPrefix('api/v1');

    // Skip Socket.IO for serverless (WebSockets don't work well with serverless)
    // Socket.IO requires persistent connections which serverless doesn't support
    // If you need WebSocket support, consider using Vercel's WebSocket support or a different platform

    // Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('Grome API')
      .setDescription('Grome Barbershop Booking Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('barbers', 'Barber management')
      .addTag('bookings', 'Booking management')
      .addTag('payments', 'Payment processing')
      .addTag('chat', 'Real-time chat')
      .addTag('notifications', 'Notification system')
      .addTag('admin', 'Admin operations')
      .addTag('threads', 'Thread operations')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    await app.init();
    cachedApp = expressApp;

    logger.log('🚀 Application initialized for serverless deployment');
    return cachedApp;
  } catch (error) {
    const logger = new Logger('Bootstrap');
    logger.error('Failed to initialize application:', error);
    throw error;
  }
}

const handler = async (req: express.Request, res: express.Response) => {
  try {
    const app = await createApp();
    return app(req, res);
  } catch (error) {
    const logger = new Logger('Handler');
    logger.error('Handler error:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
    });
  }
};

export default handler;

