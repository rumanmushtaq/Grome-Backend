import { UserBlock, UserBlockSchema } from '@/schemas/user-block.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlockService } from './blocks.service';
import { BlockController } from './blocks.controller';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserBlock.name, schema: UserBlockSchema },
    ]),
  ],
  providers: [BlockService],
  controllers: [BlockController],
  exports: [BlockService],
})
export class BlockModule {}
