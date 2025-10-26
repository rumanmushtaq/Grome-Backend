import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import { S3StorageController } from './s3Storage.controller';
import { S3StorageService } from './s3Storage.service';

@Module({
  imports: [ConfigModule],
  controllers: [S3StorageController],
  exports: [S3StorageService],
  providers: [
    S3StorageService,
    {
      provide: 'S3',
      useFactory: (config: ConfigService) => {
        return new S3({
          accessKeyId: process.env.AWS_ACCESS_KEY,
          secretAccessKey: process.env.AWS_SECRET_KEY,
          region: process.env.AWS_REGION,
        });
      },
      inject: [ConfigService],
    },
  ],
})
export class S3StorageModule {}
