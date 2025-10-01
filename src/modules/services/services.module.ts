import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { AdminServicesController } from './admin-services.controller';
import { AdminServicesService } from './admin-services.service';
import { BarberServicesController } from './barber-services.controller';
import { BarberServicesService } from './barber-services.service';
import { Service, ServiceSchema } from '../../schemas/service.schema';
import { Barber, BarberSchema } from '../../schemas/barber.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Service.name, schema: ServiceSchema },
      { name: Barber.name, schema: BarberSchema },
    ]),
  ],
  controllers: [
    ServicesController,
    AdminServicesController,
    BarberServicesController,
  ],
  providers: [
    ServicesService,
    AdminServicesService,
    BarberServicesService,
  ],
  exports: [
    ServicesService,
    AdminServicesService,
    BarberServicesService,
  ],
})
export class ServicesModule {}
