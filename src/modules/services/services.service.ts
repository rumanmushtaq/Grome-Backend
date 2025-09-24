import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Service, ServiceDocument } from '../../schemas/service.schema';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
  ) {}

  // TODO: Implement service management methods
  async findAll() {
    return this.serviceModel.find({ isActive: true }).exec();
  }

  async findById(id: string) {
    return this.serviceModel.findById(id).exec();
  }
}
