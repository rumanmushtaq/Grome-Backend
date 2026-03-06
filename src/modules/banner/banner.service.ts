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

  async create(dto: CreateBannerDto) {
    try {
      const banner = new this.bannerModel(dto);
      const saved = await banner.save();

      return {
        success: true,
        message: 'Banner created successfully',
        data: saved,
      };
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  /* ============================= FIND ALL ============================= */

  async findAll() {
    try {
      const banners = await this.bannerModel
        .find()
        .sort({ order: 1 })
        .lean()
        .exec();

      return {
        success: true,
        message: 'Banners fetched successfully',
        data: banners,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to fetch banners. Please try again later.',
      );
    }
  }

  /* ============================= FIND ACTIVE ============================= */

  async findActive() {
    try {
      const now = new Date();

      const banners = await this.bannerModel
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

      return {
        success: true,
        message: 'Active banners fetched successfully',
        data: banners,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to fetch active banners.',
      );
    }
  }

  /* ============================= FIND ONE ============================= */

  async findOne(id: string) {
    try {
      if (!isValidObjectId(id)) {
        throw new BadRequestException(InvalidId('Invalid banner ID format'));
      }

      const banner = await this.bannerModel.findById(id).lean();

      if (!banner) {
        throw new NotFoundException(NotFound('Banner'));
      }

      return {
        success: true,
        message: 'Banner fetched successfully',
        data: banner,
      };
    } catch (error) {
      this.handleServiceError(error, 'Failed to fetch banner.');
    }
  }

  /* ============================= UPDATE ============================= */

  async update(id: string, dto: UpdateBannerDto) {
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

      return {
        success: true,
        message: 'Banner updated successfully',
        data: banner,
      };
    } catch (error) {
      this.handleServiceError(error, 'Failed to update banner.');
    }
  }

  /* ============================= DELETE ============================= */

  async remove(id: string) {
    try {
      if (!isValidObjectId(id)) {
        throw new BadRequestException(InvalidId('Invalid banner ID format'));
      }

      const banner = await this.bannerModel.findByIdAndDelete(id);

      if (!banner) {
        throw new NotFoundException(NotFound('Banner'));
      }

      return {
        success: true,
        message: 'Banner deleted successfully',
        data: banner,
      };
    } catch (error) {
      this.handleServiceError(error, 'Failed to delete banner.');
    }
  }

  /* ============================= UPDATE STATUS ============================= */

  async updateStatus(id: string, isActive: boolean) {
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
          success: true,
          message: `Banner is already ${isActive ? 'active' : 'inactive'}`,
          data: banner,
        };
      }

      banner.isActive = isActive;
      const updated = await banner.save();

      return {
        success: true,
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
    if (error?.code === 11000) {
      throw new BadRequestException('Duplicate field value entered.');
    }

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