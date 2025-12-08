import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from 'src/configs/configs.module';
import { ConfigService } from 'src/configs/configs.service';
import { ENTITIES } from './entities';

export const DatabaseProvider = [
  MongooseModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => ({
      uri: configService.MONGODB_TEST_URI,
    }),
  }),
  MongooseModule.forFeature(ENTITIES),
];