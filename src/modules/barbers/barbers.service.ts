import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Barber, BarberDocument } from '../../schemas/barber.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { CreateBarberDto, UpdateBarberDto, SearchBarbersDto, BarberResponseDto } from '../../dto/barbers/barber.dto';

@Injectable()
export class BarbersService {
  constructor(
    @InjectModel(Barber.name) private barberModel: Model<BarberDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async createBarber(userId: string, createBarberDto: CreateBarberDto): Promise<BarberResponseDto> {
    // Check if user exists and is a barber
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'barber') {
      throw new ForbiddenException('User must be a barber to create barber profile');
    }

    // Check if barber profile already exists
    const existingBarber = await this.barberModel.findOne({ userId });
    if (existingBarber) {
      throw new ForbiddenException('Barber profile already exists');
    }

    const barber = new this.barberModel({
      userId,
      ...createBarberDto,
    });

    await barber.save();
    return this.mapToResponseDto(barber);
  }

  async updateBarber(userId: string, updateBarberDto: UpdateBarberDto): Promise<BarberResponseDto> {
    const barber = await this.barberModel.findOneAndUpdate(
      { userId },
      { $set: updateBarberDto },
      { new: true }
    ).exec();

    if (!barber) {
      throw new NotFoundException('Barber profile not found');
    }

    return this.mapToResponseDto(barber);
  }

  async getBarberById(barberId: string): Promise<BarberResponseDto> {
    const barber = await this.barberModel.findById(barberId).exec();
    if (!barber) {
      throw new NotFoundException('Barber not found');
    }

    return this.mapToResponseDto(barber);
  }

  async getBarberByUserId(userId: string): Promise<BarberResponseDto> {
    const barber = await this.barberModel.findOne({ userId }).exec();
    if (!barber) {
      throw new NotFoundException('Barber profile not found');
    }

    return this.mapToResponseDto(barber);
  }

  async searchBarbers(searchDto: SearchBarbersDto): Promise<{
    barbers: BarberResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      latitude,
      longitude,
      radius = 10,
      serviceId,
      minRating = 0,
      sortBy = 'distance',
      sortOrder = 'asc',
      page = 1,
      limit = 10,
    } = searchDto;

    const skip = (page - 1) * limit;

    // Build aggregation pipeline
    const pipeline: any[] = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          distanceField: 'distance',
          maxDistance: radius * 1000, // Convert km to meters
          spherical: true,
        },
      },
      {
        $match: {
          isActive: true,
          rating: { $gte: minRating },
          ...(serviceId && {
            'services.serviceId': serviceId,
          }),
        },
      },
    ];

    // Add sorting
    const sortField = sortBy === 'distance' ? 'distance' : sortBy;
    pipeline.push({
      $sort: { [sortField]: sortOrder === 'asc' ? 1 : -1 },
    });

    // Add pagination
    pipeline.push(
      { $skip: skip },
      { $limit: limit }
    );

    // Execute aggregation
    const [barbers, totalCount] = await Promise.all([
      this.barberModel.aggregate(pipeline).exec(),
      this.barberModel.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            distanceField: 'distance',
            maxDistance: radius * 1000,
            spherical: true,
          },
        },
        {
          $match: {
            isActive: true,
            rating: { $gte: minRating },
            ...(serviceId && {
              'services.serviceId': serviceId,
            }),
          },
        },
        { $count: 'total' },
      ]).exec(),
    ]);

    const total = totalCount[0]?.total || 0;

    return {
      barbers: barbers.map(barber => this.mapToResponseDto(barber)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getNearbyBarbers(latitude: number, longitude: number, radius: number = 10): Promise<BarberResponseDto[]> {
    
    console.log("radius", radius)
    const barbers = await this.barberModel.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          distanceField: 'distance',
          maxDistance: radius * 1000, // Convert km to meters
          spherical: true,
        },
      },
      {
        $match: {
          isActive: true,
          isOnline: true,
        },
      },
      {
        $sort: { distance: 1 },
      },
      {
        $limit: 20,
      },
    ]).exec();

    return barbers.map(barber => this.mapToResponseDto(barber));
  }

  async updateBarberStatus(userId: string, isOnline: boolean): Promise<BarberResponseDto> {
    const barber = await this.barberModel.findOneAndUpdate(
      { userId },
      { 
        isOnline,
        lastSeenAt: new Date(),
      },
      { new: true }
    ).exec();

    if (!barber) {
      throw new NotFoundException('Barber profile not found');
    }

    return this.mapToResponseDto(barber);
  }

  async updateBarberRating(barberId: string, newRating: number): Promise<BarberResponseDto> {
    const barber = await this.barberModel.findById(barberId);
    if (!barber) {
      throw new NotFoundException('Barber not found');
    }

    // Calculate new average rating
    const totalRating = barber.rating * barber.reviewsCount + newRating;
    const newReviewsCount = barber.reviewsCount + 1;
    const averageRating = totalRating / newReviewsCount;

    barber.rating = Math.round(averageRating * 10) / 10; // Round to 1 decimal place
    barber.reviewsCount = newReviewsCount;

    await barber.save();
    return this.mapToResponseDto(barber);
  }

  async getAllBarbers(page: number = 1, limit: number = 10): Promise<{
    barbers: BarberResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [barbers, total] = await Promise.all([
      this.barberModel.find({ isActive: true }).skip(skip).limit(limit).exec(),
      this.barberModel.countDocuments({ isActive: true }).exec(),
    ]);

    return {
      barbers: barbers.map(barber => this.mapToResponseDto(barber)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private mapToResponseDto(barber: BarberDocument | any): BarberResponseDto {
    return {
      id: barber._id.toString(),
      userId: barber.userId.toString(),
      location: barber.location,
      services: barber.services,
      rating: barber.rating,
      reviewsCount: barber.reviewsCount,
      availability: barber.availability,
      experienceYears: barber.experienceYears,
      images: barber.images,
      description :  barber.description,
      bio: barber.bio,
      specialties: barber.specialties,
      isActive: barber.isActive,
      isOnline: barber.isOnline,
      lastSeenAt: barber.lastSeenAt,
      commissionRate: barber.commissionRate,
      serviceRadius: barber.serviceRadius,
      createdAt: barber.createdAt,
      updatedAt: barber.updatedAt,
      distance: barber.distance, // This will be present in geo queries
    };
  }
}
