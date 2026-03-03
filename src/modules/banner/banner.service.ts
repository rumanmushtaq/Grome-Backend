import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Banner, BannerDocument } from '@/schemas/banner.schema';
import { CreateBannerDto, UpdateBannerDto } from './dtos/banner.dto';
import { InvalidId, NotFound } from '@/constants/messages.constants';

@Injectable()
export class BannerService {
  constructor(
    @InjectModel(Banner.name)
    private readonly bannerModel: Model<BannerDocument>,
  ) {}

  /* ============================= CREATE ============================= */

  async create(dto: CreateBannerDto): Promise<Banner> {
    try {
      const banner = new this.bannerModel(dto);
      return await banner.save();
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  /* ============================= FIND ALL ============================= */

  async findAll(): Promise<Banner[]> {
    try {
      return await this.bannerModel.find().sort({ order: 1 }).lean().exec();
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to fetch banners. Please try again later.',
      );
    }
  }

  /* ============================= FIND ACTIVE ============================= */

  async findActive(): Promise<Banner[]> {
    try {
      const now = new Date();

      return await this.bannerModel
        .find({
          isActive: true,
          $and: [
            {
              $or: [{ startDate: null }, { startDate: { $lte: now } }],
            },
            {
              $or: [{ endDate: null }, { endDate: { $gte: now } }],
            },
          ],
        })
        .sort({ order: 1 })
        .lean()
        .exec();
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to fetch active banners.',
      );
    }
  }

  /* ============================= FIND ONE ============================= */

  async findOne(id: string): Promise<Banner> {
    try {
      if (!isValidObjectId(id)) {
        throw new BadRequestException(InvalidId('Invalid banner ID format'));
      }

      const banner = await this.bannerModel.findById(id).lean();

      if (!banner) {
        throw new NotFoundException(NotFound('Banner'));
      }

      return banner;
    } catch (error) {
      this.handleServiceError(error, 'Failed to fetch banner.');
    }
  }

  /* ============================= UPDATE ============================= */

  async update(id: string, dto: UpdateBannerDto): Promise<Banner> {
    try {
      if (!isValidObjectId(id)) {
        throw new BadRequestException(InvalidId('Invalid banner ID format'));
      }

      const banner = await this.bannerModel.findByIdAndUpdate(id, dto, {
        new: true,
        runValidators: true,
      });

      if (!banner) {
        throw new NotFoundException(NotFound('Banner'));
      }

      return banner;
    } catch (error) {
      this.handleServiceError(error, 'Failed to update banner.');
    }
  }

  /* ============================= DELETE ============================= */

  async remove(id: string): Promise<{ message: string }> {
    try {
      if (!isValidObjectId(id)) {
        throw new BadRequestException(InvalidId('Invalid banner ID format'));
      }

      const banner = await this.bannerModel.findByIdAndDelete(id);

      if (!banner) {
        throw new NotFoundException(NotFound('Banner'));
      }

      return { message: 'Banner deleted successfully' };
    } catch (error) {
      this.handleServiceError(error, 'Failed to delete banner.');
    }
  }

  /* ============================= UPDATE STATUS ============================= */

  async updateStatus(
    id: string,
    isActive: boolean,
  ): Promise<{ message: string; data: Banner }> {
    try {
      if (!isValidObjectId(id)) {
        throw new BadRequestException(InvalidId('Invalid banner ID format'));
      }

      const banner = await this.bannerModel.findById(id);

      if (!banner) {
        throw new NotFoundException(NotFound('Banner'));
      }

      if (banner.isActive === isActive) {
        return {
          message: `Banner is already ${isActive ? 'active' : 'inactive'}`,
          data: banner,
        };
      }

      banner.isActive = isActive;
      const updated = await banner.save();

      return {
        message: `Banner ${
          isActive ? 'activated' : 'deactivated'
        } successfully`,
        data: updated,
      };
    } catch (error) {
      this.handleServiceError(error, 'Failed to update banner status.');
    }
  }

  /* ============================= COMMON ERROR HANDLER ============================= */

  private handleDatabaseError(error: any): never {
    // Duplicate key error
    if (error?.code === 11000) {
      throw new BadRequestException('Duplicate field value entered.');
    }

    // Validation error
    if (error?.name === 'ValidationError') {
      throw new BadRequestException(error.message);
    }

    throw new InternalServerErrorException(
      'Database error occurred. Please try again later.',
    );
  }

  private handleServiceError(error: any, fallbackMessage: string): never {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }

    this.handleDatabaseError(error);

    throw new InternalServerErrorException(fallbackMessage);
  }
}