import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model, Types } from "mongoose";

import { Barber, BarberDocument } from "../../schemas/barber.schema";
import { Service, ServiceDocument } from "../../schemas/service.schema";
import {
  BarberServiceUpdateDto,
  BarberServiceResponseDto,
} from "../../dto/services/barber-service.dto";
import { PaginationDto } from "@/dto/common/pagination.dto";

@Injectable()
export class BarberServicesService {
  constructor(
    @InjectModel(Barber.name) private barberModel: Model<BarberDocument>,
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>
  ) {}

  async getBarberServices(
    barberUserId: string,
    query: PaginationDto
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    services: BarberServiceResponseDto[];
  }> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = query;
      // ✅ 1. Fetch barber and populate services
      const barber = await this.barberModel
        .findOne({ userId: barberUserId })
        .populate({
          path: "services.serviceId",
          model: "Service",
          options: {
            sort: { [sortBy]: sortOrder === "asc" ? 1 : -1 },
          },
        })
        .lean();

      // ✅ 2. Validate barber existence
      if (!barber) {
        throw new NotFoundException("Barber profile not found");
      }

      // ✅ 3. Handle case where no services exist
      if (!barber.services || barber.services.length === 0) {
        return {
          total: 0,
          page,
          limit,
          totalPages: 0,
          services: [],
        };
      }

      // ✅ 4. Apply pagination manually (since services are subdocuments)
      const total = barber.services.length;
      const skip = (page - 1) * limit;
      const paginated = barber.services.slice(skip, skip + limit);

      // ✅ 5. Safely map service data
      const services: BarberServiceResponseDto[] = paginated
        .map((barberService) => {
          const service = barberService.serviceId as any;
          if (!service || !service._id) return null; // skip invalid population

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
        })
        .filter(Boolean); // removes null entries
      // ✅ 6. Return paginated structured response
      return {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        services,
      };
    } catch (error) {
      // ✅ 7. Handle database or unexpected errors
      console.error("Error fetching barber services:", error);
      throw new InternalServerErrorException(
        "Failed to retrieve barber services"
      );
    }
  }

  async addServiceToBarber(
    barberUserId: string,
    serviceId: string,
    price: number
  ): Promise<{ message: string; data: BarberDocument }> {
    try {
      // ✅ 1. Validate all input parameters
      if (!isValidObjectId(barberUserId)) {
        throw new BadRequestException({
          message: "Invalid barber user ID format",
          statusCode: 400,
          error: true,
        });
      }

      if (!isValidObjectId(serviceId)) {
        throw new BadRequestException({
          message: "Invalid service ID format",
          statusCode: 400,
          error: true,
        });
      }

      // ✅ 2. Check if the service exists and is active
      const service = await this.serviceModel.findOne({
        _id: serviceId,
        isActive: true,
      });

      if (!service) {
        throw new NotFoundException({
          message: "Service not found or inactive",
          statusCode: 404,
          error: true,
        });
      }

      // ✅ 3. Check if barber profile exists
      const barber = await this.barberModel.findOne({ userId: barberUserId });

      if (!barber) {
        throw new NotFoundException({
          message: "Barber profile not found",
          statusCode: 404,
          error: true,
        });
      }
      // ✅ 4. Check if the service is already added
      const alreadyExists = barber.services?.some(
        (s) => s?.serviceId?.toString() === serviceId
      );

      if (alreadyExists) {
        throw new BadRequestException({
          message: "Service already exists in barber profile",
          statusCode: 400,
          error: true,
        });
      }
      // Add service to barber
      barber.services.push({
        serviceId: new Types.ObjectId(serviceId),
        price: price,
      });

      const updatedBarber = await barber.save();

      return {
        message: "Service successfully added to barber profile",
        data: updatedBarber,
      };
    } catch (error) {
      // ✅ Handle expected NestJS exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // ✅ Catch all unexpected errors
      throw new InternalServerErrorException({
        message: error.message || "Failed to add service to barber profile",
        statusCode: 500,
        error: true,
      });
    }
  }

  async updateBarberService(
    barberUserId: string,
    updateServiceDto: BarberServiceUpdateDto
  ): Promise<BarberDocument> {
    const barber = await this.barberModel.findOne({ userId: barberUserId });
    if (!barber) {
      throw new NotFoundException("Barber profile not found");
    }

    const serviceIndex = barber.services.findIndex(
      (s) => s.serviceId.toString() === updateServiceDto.serviceId
    );
    if (serviceIndex === -1) {
      throw new NotFoundException("Service not found in barber profile");
    }

    // Update basic service info
    if (updateServiceDto.price !== undefined) {
      barber.services[serviceIndex].price = updateServiceDto.price;
    }

    // Get the service to update additional fields
    const service = await this.serviceModel.findById(
      updateServiceDto.serviceId
    );
    if (!service) {
      throw new NotFoundException("Service not found");
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
        availableFrom: updateServiceDto.availability.availableFrom
          ? new Date(updateServiceDto.availability.availableFrom)
          : undefined,
        availableTo: updateServiceDto.availability.availableTo
          ? new Date(updateServiceDto.availability.availableTo)
          : undefined,
      };
    }

    // Save both barber and service updates
    await service.save();
    return barber.save();
  }

  async removeServiceFromBarber(
    barberUserId: string,
    serviceId: string
  ): Promise<{ message: string; data: BarberDocument }> {
    try {
      // ✅ 1. Validate all input parameters
      if (!isValidObjectId(barberUserId)) {
        throw new BadRequestException({
          message: "Invalid barber user ID format",
          statusCode: 400,
          error: true,
        });
      }

      if (!isValidObjectId(serviceId)) {
        throw new BadRequestException({
          message: "Invalid service ID format",
          statusCode: 400,
          error: true,
        });
      }

      const barber = await this.barberModel.findOne({ userId: barberUserId });
      if (!barber) {
        throw new NotFoundException({
          message: "Barber profile not found",
          statusCode: 404,
          error: true,
        });
      }
      // ✅ 3. Check if service exists in barber’s profile
      const serviceIndex = barber.services.findIndex(
        (s) => s?.serviceId?.toString() === serviceId
      );
      if (serviceIndex === -1) {
        throw new NotFoundException({
          message: "Service not found in barber profile",
          statusCode: 404,
          error: true,
        });
      }

      // ✅ 4. Remove the service safely
      barber.services.splice(serviceIndex, 1);

      // ✅ 5. Save updated barber profile
      const updatedBarber = await barber.save();

      // ✅ 6. Return consistent response
      return {
        message: "Service successfully removed from barber profile",
        data: updatedBarber,
      };
    } catch (error) {
      // ✅ Handle expected NestJS exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // ✅ Catch all unexpected errors
      throw new InternalServerErrorException({
        message:
          error.message ||
          "Failed to remove service from barber profile. Please try again later.",
        statusCode: 500,
        error: true,
      });
    }
  }

  async getAvailableServicesForBarber(
    barberUserId: string
  ): Promise<{ message: string; count: number; data: ServiceDocument[] }> {
    try {
      // ✅ 1. Validate all input parameters
      if (!isValidObjectId(barberUserId)) {
        throw new BadRequestException({
          message: "Invalid barber user ID format",
          statusCode: 400,
          error: true,
        });
      }

      const barber = await this.barberModel.findOne({ userId: barberUserId });
      if (!barber) {
        throw new NotFoundException({
          message: "Barber profile not found",
          statusCode: 404,
          error: true,
        });
      }

      // ✅ 3. Get all service IDs already assigned to this barber
      const barberServiceIds = barber.services.map((s) =>
        s.serviceId.toString()
      );

      // ✅ 4. Use MongoDB $nin query to get active services not already assigned
      const availableServices = await this.serviceModel
        .find({
          isActive: true,
          _id: { $nin: barberServiceIds },
        })
        .sort({ createdAt: -1 }) // Most recent first
        .exec();

      // ✅ 5. Return consistent structured response
      return {
        message: "Available services retrieved successfully",
        count: availableServices.length,
        data: availableServices,
      };
    } catch (error) {
      // ✅ Handle expected NestJS exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // ✅ Catch all unexpected errors
      throw new InternalServerErrorException({
        message:
          error.message ||
          "Failed to remove service from barber profile. Please try again later.",
        statusCode: 500,
        error: true,
      });
    }
  }

  async getBarberServiceById(
    barberUserId: string,
    serviceId: string
  ): Promise<BarberServiceResponseDto> {
    const barber = await this.barberModel
      .findOne({ userId: barberUserId })
      .populate("services.serviceId");
    if (!barber) {
      throw new NotFoundException("Barber profile not found");
    }

    const barberService = barber.services.find(
      (s) => s.serviceId.toString() === serviceId
    );
    if (!barberService) {
      throw new NotFoundException("Service not found in barber profile");
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
