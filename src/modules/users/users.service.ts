import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";

import {
  User,
  UserDocument,
  VerificationStatus,
} from "../../schemas/user.schema";
import {
  UpdateProfileDto,
  UpdatePreferencesDto,
  BarberVerificationDto,
  UserResponseDto,
} from "../../dto/users/user.dto";
import { PaginationDto } from "@/dto/common/pagination.dto";

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findById(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone }).exec();
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto
  ): Promise<UserResponseDto> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: updateProfileDto }, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.mapToResponseDto(user);
  }

  async updatePreferences(
    userId: string,
    updatePreferencesDto: UpdatePreferencesDto
  ): Promise<UserResponseDto> {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: { preferences: updatePreferencesDto } },
        { new: true }
      )
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.mapToResponseDto(user);
  }

  async submitBarberVerification(
    userId: string,
    verificationDto: BarberVerificationDto
  ): Promise<UserResponseDto> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.role !== "barber") {
      throw new ForbiddenException(
        "Only barbers can submit verification documents"
      );
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
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: {
            "verification.status": verificationDto.status,
            "verification.notes": verificationDto.notes,
            "verification.reviewedAt": new Date(),
            "verification.reviewedBy": adminId,
          },
        },
        { new: true }
      )
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.mapToResponseDto(user);
  }

  async getAllUsers(
    paginationDto: PaginationDto,
    role?: string
  ): Promise<{
    users: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        search,
      } = paginationDto;

      // Validate page & limit
      if (page < 1)
        throw new BadRequestException("Page must be greater than 0");
      if (limit < 1 || limit > 100)
        throw new BadRequestException("Limit must be between 1 and 100");

      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = {};
      if (role) filter.role = role;

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Validate sortBy field
      const validSortFields = ["name", "email", "createdAt", "role"];
      if (!validSortFields.includes(sortBy)) {
        throw new BadRequestException(
          `Invalid sortBy field. Valid fields: ${validSortFields.join(", ")}`
        );
      }

      // Build sort
      const sort: any = {};
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;

      // Fetch users and total count
      const [users, total] = await Promise.all([
        this.userModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
        this.userModel.countDocuments(filter).exec(),
      ]);

      // Map to DTO
      const usersDto = users.map((user) => {
        try {
          return this.mapToResponseDto(user);
        } catch (mapError) {
          throw new InternalServerErrorException(
            "Failed to map user data. Please try again later."
          );
        }
      });

      return {
        users: usersDto,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      // Catch unexpected errors
      console.error("Unexpected error in getAllUsers:", error);
      throw new InternalServerErrorException(
        "An unexpected error occurred while fetching users"
      );
    }
  }

  async deactivateUser(userId: string): Promise<UserResponseDto> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { isActive: false }, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.mapToResponseDto(user);
  }

  async activateUser(userId: string): Promise<UserResponseDto> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { isActive: true }, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.mapToResponseDto(user);
  }

  async toggleVerification(
    userId: string,
    isVerified: boolean
  ): Promise<UserResponseDto> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { isVerified: isVerified }, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.mapToResponseDto(user);
  }

  mapToResponseDto(user: UserDocument): UserResponseDto {
    try {
      if (!user) {
        throw new Error("User document is null or undefined");
      }

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
        gender: user.gender,
        verification: user.verification,
        createdAt: (user as any).createdAt,
        updatedAt: (user as any).updatedAt,
      };
    } catch (error) {
      // Log the error for debugging
      console.error("Error mapping user to response DTO:", error);

      // Throw a proper NestJS exception
      throw new InternalServerErrorException(
        "Failed to map user data. Please try again later."
      );
    }
  }

  async softDeleteUser(userId: string) {
    try {
      if (!isValidObjectId(userId)) {
        throw new BadRequestException("Invalid User ID");
      }

      const user = await this.userModel.findOne({
        _id: userId,
        isDeleted: false,
      });

      if (!user) {
        throw new NotFoundException("User not found or already deleted");
      }

      user.isDeleted = true;
      await user.save();

      return {
        success: true,
        message: "User soft-deleted successfully",
        data: user,
      };
    } catch (error) {
      console.error("Soft delete error:", error);

      throw new InternalServerErrorException(
        error?.message || "Failed to soft delete user. Please try again later."
      );
    }
  }

  // ----------------------------------------
  // ♻️ Restore Soft-Deleted User
  // ----------------------------------------
  async restoreUser(userId: string) {
    try {
      if (!isValidObjectId(userId)) {
        throw new BadRequestException("Invalid user ID.");
      }

      const user = await this.userModel.findOne({
        _id: userId,
        isDeleted: true,
      });

      if (!user) {
        throw new NotFoundException("User not found or not deleted.");
      }

      user.isDeleted = false;
      await user.save();

      return {
        success: true,
        message: "User restored successfully.",
        data: user,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error?.message || "Failed to restore user. Please try again later."
      );
    }
  }
}
