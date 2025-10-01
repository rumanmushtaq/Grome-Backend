import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Service, ServiceDocument } from '../../schemas/service.schema';
import { AdminCreateServiceDto, AdminUpdateServiceDto } from '../../dto/services/admin-service.dto';

@Injectable()
export class AdminServicesService {
  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
  ) {}

  async createService(createServiceDto: AdminCreateServiceDto): Promise<ServiceDocument> {
    const { title, basePrice, icon, category, tags } = createServiceDto;

    // Check if service with same title already exists
    const existingService = await this.serviceModel.findOne({ 
      name: title,
      isActive: true 
    });

    if (existingService) {
      throw new BadRequestException('Service with this title already exists');
    }

    const service = new this.serviceModel({
      name: title,
      basePrice,
      iconUrl: icon,
      category,
      tags,
      isActive: true,
      averageRating: 0,
      bookingsCount: 0,
      sortOrder: 0,
    });

    return service.save();
  }

  async getAllServices(): Promise<ServiceDocument[]> {
    return this.serviceModel
      .find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .exec();
  }

  async getServiceById(id: string): Promise<ServiceDocument> {
    const service = await this.serviceModel.findById(id).exec();
    
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  async updateService(id: string, updateServiceDto: AdminUpdateServiceDto): Promise<ServiceDocument> {
    const service = await this.serviceModel.findById(id);
    
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Check if updating name and it conflicts with existing service
    if (updateServiceDto.title && updateServiceDto.title !== service.name) {
      const existingService = await this.serviceModel.findOne({ 
        name: updateServiceDto.title,
        _id: { $ne: id },
        isActive: true 
      });

      if (existingService) {
        throw new BadRequestException('Service with this title already exists');
      }
    }

    // Update fields
    if (updateServiceDto.title) service.name = updateServiceDto.title;
    if (updateServiceDto.basePrice !== undefined) service.basePrice = updateServiceDto.basePrice;
    if (updateServiceDto.icon) service.iconUrl = updateServiceDto.icon;
    if (updateServiceDto.category) service.category = updateServiceDto.category;
    if (updateServiceDto.tags) service.tags = updateServiceDto.tags;
    if (updateServiceDto.description) service.description = updateServiceDto.description;
    if (updateServiceDto.images) service.images = updateServiceDto.images;
    if (updateServiceDto.isActive !== undefined) service.isActive = updateServiceDto.isActive;
    if (updateServiceDto.sortOrder !== undefined) service.sortOrder = updateServiceDto.sortOrder;

    return service.save();
  }

  async deleteService(id: string): Promise<void> {
    const service = await this.serviceModel.findById(id);
    
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Soft delete - just deactivate
    service.isActive = false;
    await service.save();
  }

  async activateService(id: string): Promise<ServiceDocument> {
    const service = await this.serviceModel.findById(id);
    
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    service.isActive = true;
    return service.save();
  }

  async deactivateService(id: string): Promise<ServiceDocument> {
    const service = await this.serviceModel.findById(id);
    
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    service.isActive = false;
    return service.save();
  }

  async getServicesByCategory(category: string): Promise<ServiceDocument[]> {
    return this.serviceModel
      .find({ category, isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }

  async searchServices(query: string): Promise<ServiceDocument[]> {
    return this.serviceModel
      .find({
        $and: [
          { isActive: true },
          {
            $or: [
              { name: { $regex: query, $options: 'i' } },
              { description: { $regex: query, $options: 'i' } },
              { tags: { $in: [new RegExp(query, 'i')] } },
            ],
          },
        ],
      })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }
}
