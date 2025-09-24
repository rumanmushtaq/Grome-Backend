import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { BarbersController } from './barbers.controller';
import { BarbersService } from './barbers.service';
import { Barber, BarberSchema } from '../../schemas/barber.schema';
import { User, UserSchema } from '../../schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Barber.name, schema: BarberSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [BarbersController],
  providers: [BarbersService],
  exports: [BarbersService],
})
export class BarbersModule {}
