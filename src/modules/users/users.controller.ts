import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Delete,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";

import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  UpdateProfileDto,
  UpdatePreferencesDto,
  BarberVerificationDto,
  UserResponseDto,
} from "../../dto/users/user.dto";
import { PaginationDto } from "../../dto/common/pagination.dto";
import { UserRole } from "../../schemas/user.schema";

@ApiTags("users")
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("profile")
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({
    status: 200,
    description: "User profile retrieved successfully",
    type: UserResponseDto,
  })
  async getProfile(@CurrentUser() user: any): Promise<UserResponseDto> {
    const userDoc = await this.usersService.findById(user.userId);
    if (!userDoc) {
      throw new Error("User not found");
    }
    return this.usersService.mapToResponseDto(userDoc);
  }

  @Put("profile")
  @ApiOperation({ summary: "Update user profile" })
  @ApiResponse({
    status: 200,
    description: "Profile updated successfully",
    type: UserResponseDto,
  })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateProfileDto: UpdateProfileDto
  ): Promise<UserResponseDto> {
    return this.usersService.updateProfile(user.userId, updateProfileDto);
  }

  @Put("preferences")
  @ApiOperation({ summary: "Update user preferences" })
  @ApiResponse({
    status: 200,
    description: "Preferences updated successfully",
    type: UserResponseDto,
  })
  async updatePreferences(
    @CurrentUser() user: any,
    @Body() updatePreferencesDto: UpdatePreferencesDto
  ): Promise<UserResponseDto> {
    return this.usersService.updatePreferences(
      user.userId,
      updatePreferencesDto
    );
  }

  @Post("barber/verification")
  @Roles(UserRole.BARBER)
  @ApiOperation({ summary: "Submit barber verification documents" })
  @ApiResponse({
    status: 200,
    description: "Verification documents submitted successfully",
    type: UserResponseDto,
  })
  async submitBarberVerification(
    @CurrentUser() user: any,
    @Body() verificationDto: BarberVerificationDto
  ): Promise<UserResponseDto> {
    return this.usersService.submitBarberVerification(
      user.userId,
      verificationDto
    );
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get all users (Admin only)" })
  @ApiResponse({ status: 200, description: "Users retrieved successfully" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "sortBy", required: false, type: String })
  @ApiQuery({ name: "sortOrder", required: false, enum: ["asc", "desc"] })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "role", required: false, enum: UserRole })
  async getAllUsers(
    @Query() paginationDto: PaginationDto,
    @Query("role") role?: UserRole
  ) {
    console.log("Fetching users with role:", role);
    return this.usersService.getAllUsers(

      paginationDto,
      role
    );
  }

  @Get(":id")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get user by ID (Admin only)" })
  @ApiParam({ name: "id", description: "User ID" })
  @ApiResponse({
    status: 200,
    description: "User retrieved successfully",
    type: UserResponseDto,
  })
  async getUserById(@Param("id") id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new Error("User not found");
    }
    return this.usersService.mapToResponseDto(user);
  }

  @Patch(":id/verification")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Update barber verification status (Admin only)" })
  @ApiParam({ name: "id", description: "User ID" })
  @ApiResponse({
    status: 200,
    description: "Verification status updated successfully",
    type: UserResponseDto,
  })
  async updateBarberVerification(
    @Param("id") id: string,
    @Body() verificationDto: { status: string; notes?: string },
    @CurrentUser() admin: any
  ): Promise<UserResponseDto> {
    return this.usersService.updateBarberVerification(
      id,
      verificationDto,
      admin.userId
    );
  }

  @Patch(":id/deactivate")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Deactivate user (Admin only)" })
  @ApiParam({ name: "id", description: "User ID" })
  @ApiResponse({
    status: 200,
    description: "User deactivated successfully",
    type: UserResponseDto,
  })
  async deactivateUser(@Param("id") id: string): Promise<UserResponseDto> {
    return this.usersService.deactivateUser(id);
  }

  @Patch(":id/activate")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Activate user (Admin only)" })
  @ApiParam({ name: "id", description: "User ID" })
  @ApiResponse({
    status: 200,
    description: "User activated successfully",
    type: UserResponseDto,
  })
  async activateUser(@Param("id") id: string): Promise<UserResponseDto> {
    return this.usersService.activateUser(id);
  }

  @Patch(":id/toggle-verification")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Verified User (Admin only)" })
  @ApiParam({ name: "id", description: "User ID" })
  @ApiQuery({ name: "isVerified", required: true, type: Boolean })
  @ApiResponse({
    status: 200,
    description: "User activated successfully",
    type: UserResponseDto,
  })
  async toggleVerification(
    @Param("id") id: string,
    @Query("isVerified") isVerified: boolean
  ): Promise<UserResponseDto> {
    return this.usersService.toggleVerification(id, isVerified);
  }




  @Delete(":id")
  @Roles(UserRole.ADMIN)
  softDelete(@Param("id") id: string) {
    return this.usersService.softDeleteUser(id);
  }


  @Patch("restore/:id")
  @Roles(UserRole.ADMIN)
  restoreUser(@Param("id") id: string) {
    return this.usersService.restoreUser(id);
  }
}
