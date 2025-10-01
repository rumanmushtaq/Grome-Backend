import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Barber, BarberDocument } from '../../schemas/barber.schema';
import { Service, ServiceDocument } from '../../schemas/service.schema';
import { BarberServiceUpdateDto, BarberServiceResponseDto } from '../../dto/services/barber-service.dto';

@Injectable()
export class BarberServicesService {
  constructor(
    @InjectModel(Barber.name) private barberModel: Model<BarberDocument>,
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
  ) {}

  async getBarberServices(barberUserId: string): Promise<BarberServiceResponseDto[]> {
    const barber = await this.barberModel.findOne({ userId: barberUserId }).populate('services.serviceId');
    
    if (!barber) {
      throw new NotFoundException('Barber profile not found');
    }

    return barber.services.map(barberService => {
      const service = barberService.serviceId as any; // Populated service
      return {
        serviceId: service._id.toString(),
        title: service.name,
        description: service.description,
        basePrice: service.basePrice,
        price: barberService.price,
        durationMinutes: service.durationMinutes,
        category: service.category,
        tags: service.tags,
        iconUrl: service.iconUrl,
        images: service.images,
        pricingTiers: service.pricingTiers,
        requirements: service.requirements,
        availability: service.availability,
        isActive: service.isActive,
        averageRating: service.averageRating,
        bookingsCount: service.bookingsCount,
      };
    });
  }

  async addServiceToBarber(barberUserId: string, serviceId: string, price: number): Promise<BarberDocument> {
    // Validate service exists and is active
    const service = await this.serviceModel.findOne({ _id: serviceId, isActive: true });
    if (!service) {
      throw new NotFoundException('Service not found or inactive');
    }

    const barber = await this.barberModel.findOne({ userId: barberUserId });
    if (!barber) {
      throw new NotFoundException('Barber profile not found');
    }

    // Check if service already exists in barber's services
    const existingService = barber.services.find(s => s.serviceId.toString() === serviceId);
    if (existingService) {
      throw new BadRequestException('Service already exists in barber profile');
    }

    // Add service to barber
    barber.services.push({
      serviceId: new Types.ObjectId(serviceId),
      price: price,
    });

    return barber.save();
  }

  async updateBarberService(barberUserId: string, updateServiceDto: BarberServiceUpdateDto): Promise<BarberDocument> {
    const barber = await this.barberModel.findOne({ userId: barberUserId });
    if (!barber) {
      throw new NotFoundException('Barber profile not found');
    }

    const serviceIndex = barber.services.findIndex(s => s.serviceId.toString() === updateServiceDto.serviceId);
    if (serviceIndex === -1) {
      throw new NotFoundException('Service not found in barber profile');
    }

    // Update basic service info
    if (updateServiceDto.price !== undefined) {
      barber.services[serviceIndex].price = updateServiceDto.price;
    }

    // Get the service to update additional fields
    const service = await this.serviceModel.findById(updateServiceDto.serviceId);
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Update service-level customizations
    if (updateServiceDto.description !== undefined) {
      service.description = updateServiceDto.description;
    }
    if (updateServiceDto.images !== undefined) {
      service.images = updateServiceDto.images;
    }
    if (updateServiceDto.pricingTiers !== undefined) {
      service.pricingTiers = updateServiceDto.pricingTiers;
    }
    if (updateServiceDto.requirements !== undefined) {
      service.requirements = updateServiceDto.requirements;
    }
    if (updateServiceDto.availability !== undefined) {
      service.availability = {
        ...updateServiceDto.availability,
        availableFrom: updateServiceDto.availability.availableFrom ? new Date(updateServiceDto.availability.availableFrom) : undefined,
        availableTo: updateServiceDto.availability.availableTo ? new Date(updateServiceDto.availability.availableTo) : undefined,
      };
    }

    // Save both barber and service updates
    await service.save();
    return barber.save();
  }

  async removeServiceFromBarber(barberUserId: string, serviceId: string): Promise<void> {
    const barber = await this.barberModel.findOne({ userId: barberUserId });
    if (!barber) {
      throw new NotFoundException('Barber profile not found');
    }

    const serviceIndex = barber.services.findIndex(s => s.serviceId.toString() === serviceId);
    if (serviceIndex === -1) {
      throw new NotFoundException('Service not found in barber profile');
    }

    // Remove service from barber's services
    barber.services.splice(serviceIndex, 1);
    await barber.save();
  }

  async getAvailableServicesForBarber(barberUserId: string): Promise<ServiceDocument[]> {
    const barber = await this.barberModel.findOne({ userId: barberUserId });
    if (!barber) {
      throw new NotFoundException('Barber profile not found');
    }

    // Get all active services
    const allServices = await this.serviceModel.find({ isActive: true }).exec();
    
    // Filter out services already added by this barber
    const barberServiceIds = barber.services.map(s => s.serviceId.toString());
    const availableServices = allServices.filter(service => 
      !barberServiceIds.includes(service._id.toString())
    );

    return availableServices;
  }

  async getBarberServiceById(barberUserId: string, serviceId: string): Promise<BarberServiceResponseDto> {
    const barber = await this.barberModel.findOne({ userId: barberUserId }).populate('services.serviceId');
    if (!barber) {
      throw new NotFoundException('Barber profile not found');
    }

    const barberService = barber.services.find(s => s.serviceId.toString() === serviceId);
    if (!barberService) {
      throw new NotFoundException('Service not found in barber profile');
    }

    const service = barberService.serviceId as any; // Populated service
    return {
      serviceId: service._id.toString(),
      title: service.name,
      description: service.description,
      basePrice: service.basePrice,
      price: barberService.price,
      durationMinutes: service.durationMinutes,
      category: service.category,
      tags: service.tags,
      iconUrl: service.iconUrl,
      images: service.images,
      pricingTiers: service.pricingTiers,
      requirements: service.requirements,
      availability: service.availability,
      isActive: service.isActive,
      averageRating: service.averageRating,
      bookingsCount: service.bookingsCount,
    };
  }
}
