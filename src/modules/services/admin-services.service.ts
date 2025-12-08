import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";
import { ThrottlerGuard } from "@nestjs/throttler";
import { Service, ServiceDocument } from "../../schemas/service.schema";
import {
  AdminCreateServiceDto,
  AdminUpdateServiceDto,
} from "../../dto/services/admin-service.dto";
import { PaginationDto } from "@/dto/common/pagination.dto";

@Injectable()
export class AdminServicesService {
  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>
  ) {}

  // async createService(
  //   createServiceDto: AdminCreateServiceDto
  // ): Promise<ServiceDocument> {
  async createService(
    createServiceDto: AdminCreateServiceDto
  ): Promise<object> {
    const { title, basePrice, icon, durationMinutes, categoryId, tags } =
      createServiceDto;

    try {
      const existingService = await this.serviceModel.findOne({
        name: title,
        isActive: true,
      });

      if (existingService) {
        throw new BadRequestException("Service with this title already exists");
      }
      const service = new this.serviceModel({
        name: title,
        basePrice,
        iconUrl: icon,
        categoryId,
        tags,
        durationMinutes,
        isActive: true,
        averageRating: 0,
        bookingsCount: 0,
        sortOrder: 0,
      });

      await service.save();
      return {
        status: 201,
        message: "Service created successfully",
      };
    } catch (error) {
      // await this.logService.create({
      //   message: error.message,
      //   dir: filename,
      //   type: ErrorStatus.ERROR,
      //   errorCode: HttpStatus.FORBIDDEN,
      // });

      throw new BadRequestException(error.message);
    }
    // Check if service with same title already exists
  }

  async getAllServices(
    query: PaginationDto
  ): Promise<{ message: string; meta: any; data: any[] }> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = query;

      const skip = (page - 1) * limit;
      const sortDirection = sortOrder === "asc" ? 1 : -1;

      // ----------------------------
      // Aggregation with category
      // ----------------------------
      const result = await this.serviceModel.aggregate([
        // 1) Sort first
        {
          $sort: { [sortBy]: sortDirection },
        },

        // 2) Pagination + lookup using FACET
        {
          $facet: {
            data: [
              { $skip: skip },
              { $limit: limit },

              // JOIN Category collection
              {
                $lookup: {
                  from: "categories", // MUST match your real collection name!
                  localField: "categoryId",
                  foreignField: "_id",
                  as: "category",
                },
              },

              // Convert array → object
              {
                $unwind: {
                  path: "$category",
                  preserveNullAndEmptyArrays: true,
                },
              },

              // Optional: projection cleanup
              {
                $project: {
                  _id: 1,
                  name: 1,
                  price: 1,
                  isActive: 1,
                  createdAt: 1,
                  updatedAt: 1,
                  category: {
                    _id: 1,
                    title: 1,
                    iconUrl: 1,
                  },
                },
              },
            ],

            // Meta: total count
            meta: [{ $count: "totalItems" }],
          },
        },
      ]);

      const services = result[0].data;
      const totalItems = result[0].meta[0]?.totalItems || 0;

      const totalPages = Math.ceil(totalItems / limit);

      return {
        message: "Services retrieved successfully",
        meta: {
          totalItems,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        data: services,
      };
    } catch (error) {
      throw new InternalServerErrorException("Failed to fetch services");
    }
  }

  async getServiceById(
    id: string
  ): Promise<{ message: string; data: ServiceDocument }> {
    try {
      // Validate ID format
      if (!isValidObjectId(id)) {
        throw new BadRequestException("Invalid service ID format");
      }

      // Find the service by ID
      const service = await this.serviceModel.findById(id).exec();

      // Handle case when service not found
      if (!service) {
        throw new NotFoundException("Service not found");
      }
      // ✅ 4. Return structured response
      return {
        message: "Service retrieved successfully",
        data: service,
      };
    } catch (error) {
      // ✅ 5. Known NestJS exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // ✅ 6. Unexpected or DB errors
      throw new InternalServerErrorException(
        "Failed to retrieve service. Please try again later."
      );
    }
  }

  async updateService(
    id: string,
    updateServiceDto: AdminUpdateServiceDto
  ): Promise<{ message: string; data: ServiceDocument }> {
    try {
      // Find the service by ID
      const service = await this.serviceModel.findById(id);

      if (!service) {
        throw new NotFoundException({
          message: "Service not found",
          error: true,
          statusCode: 404,
        });
      }

      // Check for title conflicts (if title is being updated)
      if (updateServiceDto.title && updateServiceDto.title !== service.name) {
        const existingService = await this.serviceModel.findOne({
          name: updateServiceDto.title,
          _id: { $ne: id },
          isActive: true,
        });

        if (existingService) {
          throw new BadRequestException({
            message: "A service with this title already exists",
            error: true,
            statusCode: 400,
          });
        }
      }

      // Update fields
      if (updateServiceDto.title) service.name = updateServiceDto.title;
      if (updateServiceDto.basePrice !== undefined)
        service.basePrice = updateServiceDto.basePrice;
      if (updateServiceDto.icon) service.iconUrl = updateServiceDto.icon;
      if (updateServiceDto.categoryIds)
        service.categoryIds = updateServiceDto.categoryIds as any;
      if (updateServiceDto.tags) service.tags = updateServiceDto.tags;
      if (updateServiceDto.description)
        service.description = updateServiceDto.description;
      if (updateServiceDto.images) service.images = updateServiceDto.images;
      if (updateServiceDto.isActive !== undefined)
        service.isActive = updateServiceDto.isActive;
      if (updateServiceDto.sortOrder !== undefined)
        service.sortOrder = updateServiceDto.sortOrder;

      const updatedService = await service.save();

      return {
        message: "Service updated successfully",

        data: updatedService,
      };
    } catch (error) {
      // Handle MongoDB errors or validation issues
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException({
        message:
          error.message ||
          "An unexpected error occurred while updating the service",
        error: true,
        statusCode: 400,
      });
    }
  }

  async deleteService(id: string): Promise<{ message: string; data: any }> {
    try {
      // ✅ 1. Validate ID format
      if (!isValidObjectId(id)) {
        throw new BadRequestException("Invalid service ID format");
      }

      // ✅ 2. Find the service by ID
      const service = await this.serviceModel.findById(id);
      if (!service) {
        throw new NotFoundException("Service not found");
      }

      // ✅ 3. Check if already inactive
      if (!service.isActive) {
        return {
          message: "Service is already inactive",
          data: service,
        };
      }

      // ✅ 4. Soft delete (deactivate)
      service.isActive = false;
      await service.save();

      // ✅ 5. Return structured response
      return {
        message: "Service deactivated successfully",
        data: service,
      };
    } catch (error) {
      // ✅ Handle expected NestJS exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // ✅ Unexpected errors
      throw new InternalServerErrorException(
        "Failed to deactivate service. Please try again later."
      );
    }
  }

  async updateServiceStatus(
    id: string,
    isActive: boolean
  ): Promise<{ message: string; data: ServiceDocument }> {
    try {
      // ✅ 1. Validate ObjectId
      if (!isValidObjectId(id)) {
        throw new BadRequestException("Invalid service ID format");
      }

      // ✅ 2. Find the service
      const service = await this.serviceModel.findById(id);
      if (!service) {
        throw new NotFoundException("Service not found");
      }

      // ✅ 3. Check if already active
      if (service.isActive === isActive) {
        return {
          message: `Service is already ${isActive ? "active" : "inactive"}`,
          data: service,
        };
      }

      // ✅ 4. Activate the service
      service.isActive = isActive;
      const updateService = await service.save();

      // ✅ 5. Return structured response
      return {
        message: `Service ${isActive ? "activated" : "deactivated"} successfully`,
        data: updateService,
      };
    } catch (error) {
      // ✅ Handle known exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // ✅ Catch-all for unexpected errors
      throw new InternalServerErrorException(
        "Failed to activate service. Please try again later."
      );
    }
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
              { name: { $regex: query, $options: "i" } },
              { description: { $regex: query, $options: "i" } },
              { tags: { $in: [new RegExp(query, "i")] } },
            ],
          },
        ],
      })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
  }
}
