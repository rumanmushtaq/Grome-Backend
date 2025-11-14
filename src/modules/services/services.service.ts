import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";

import { Service, ServiceDocument } from "../../schemas/service.schema";
import { PaginationDto } from "@/dto/common/pagination.dto";
import { getEnabledCategories } from "trace_events";

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>
  ) {}

  // TODO: Implement service management methods
  async findAll(query: PaginationDto, active?: boolean) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = query;

      const skip = (page - 1) * limit;
      const sortDirection = sortOrder === "asc" ? 1 : -1;

      // Filter only active services
      const filter: any = {
        ...(active !== undefined ? { isActive: active } : {}),
      };

      // Count total active items
      const totalItems = await this.serviceModel.countDocuments(filter);

      // Fetch paginated active services
      const services = await this.serviceModel
        .find(filter)
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limit)
        .exec();

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalItems / limit);

      return {
        message: "All services retrieved successfully",
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
      throw new InternalServerErrorException("Failed to fetch active services");
    }
  }

  async findById(id: string) {
    try {
      // ✅ Validate ID format
      if (!isValidObjectId(id)) {
        throw new BadRequestException("Invalid service ID format");
      }

      // ✅ Find only active service
      const service = await this.serviceModel.findById(id).exec();

      // ✅ Check existence
      if (!service) {
        throw new NotFoundException("Service not found or inactive");
      }

      // ✅ Return service
      return {
        message: "Service retrieved successfully",
        data: service,
      };
    } catch (error) {
      // ✅ Handle known errors gracefully
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // ✅ Catch unexpected errors
      throw new InternalServerErrorException("Failed to fetch service");
    }
  }

  async getCategories() {
    try {
      const categories = await this.serviceModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      return {
        message: "Service categories with counts retrieved successfully",
        data: categories.map((cat) => ({
          category: cat._id,
          count: cat.count,
        })),
      };
    } catch (error) {
      // ✅ Handle known errors gracefully
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // ✅ Catch unexpected errors
      throw new InternalServerErrorException("Failed to fetch service");
    }
  }
}
