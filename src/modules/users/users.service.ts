import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument, VerificationStatus } from '../../schemas/user.schema';
import { UpdateProfileDto, UpdatePreferencesDto, BarberVerificationDto, UserResponseDto } from '../../dto/users/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findById(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone }).exec();
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<UserResponseDto> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateProfileDto },
      { new: true }
    ).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToResponseDto(user);
  }

  async updatePreferences(userId: string, updatePreferencesDto: UpdatePreferencesDto): Promise<UserResponseDto> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { preferences: updatePreferencesDto } },
      { new: true }
    ).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToResponseDto(user);
  }

  async submitBarberVerification(userId: string, verificationDto: BarberVerificationDto): Promise<UserResponseDto> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'barber') {
      throw new ForbiddenException('Only barbers can submit verification documents');
    }

    user.verification = {
      ...user.verification,
      status: VerificationStatus.PENDING,
      idDocUrl: verificationDto.idDocUrl,
      certificateUrls: verificationDto.certificateUrls,
      notes: verificationDto.notes,
      submittedAt: new Date(),
    };

    await user.save();
    return this.mapToResponseDto(user);
  }

  async updateBarberVerification(
    userId: string,
    verificationDto: { status: string; notes?: string },
    adminId: string
  ): Promise<UserResponseDto> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          'verification.status': verificationDto.status,
          'verification.notes': verificationDto.notes,
          'verification.reviewedAt': new Date(),
          'verification.reviewedBy': adminId,
        },
      },
      { new: true }
    ).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToResponseDto(user);
  }

  async getAllUsers(page: number = 1, limit: number = 10, role?: string): Promise<{
    users: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const filter = role ? { role } : {};
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel.find(filter).skip(skip).limit(limit).exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      users: users.map(user => this.mapToResponseDto(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deactivateUser(userId: string): Promise<UserResponseDto> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    ).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToResponseDto(user);
  }

  async activateUser(userId: string): Promise<UserResponseDto> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { isActive: true },
      { new: true }
    ).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToResponseDto(user);
  }

  mapToResponseDto(user: UserDocument): UserResponseDto {
    return {
      id: user._id.toString(),
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
      isActive: user.isActive,
      avatarUrl: user.avatarUrl,
      lastLoginAt: user.lastLoginAt,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      preferences: user.preferences,
      verification: user.verification,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    };
  }
}
