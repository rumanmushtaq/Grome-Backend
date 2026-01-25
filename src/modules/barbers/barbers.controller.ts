import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseFloatPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";

import { BarbersService } from "./barbers.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  CreateBarberDto,
  UpdateBarberDto,
  SearchBarbersDto,
  BarberResponseDto,
} from "../../dto/barbers/barber.dto";
import { PaginationDto } from "../../dto/common/pagination.dto";
import { UserRole } from "../../schemas/user.schema";

@ApiTags("barbers")
@Controller("barbers")
export class BarbersController {
  constructor(private readonly barbersService: BarbersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create barber profile" })
  @ApiResponse({
    status: 201,
    description: "Barber profile created successfully",
    type: BarberResponseDto,
  })
  async createBarber(
    @CurrentUser() user: any,
    @Body() createBarberDto: CreateBarberDto,
  ): Promise<BarberResponseDto> {
    return this.barbersService.createBarber(user.userId, createBarberDto);
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update barber profile" })
  @ApiResponse({
    status: 200,
    description: "Barber profile updated successfully",
    type: BarberResponseDto,
  })
  async updateBarber(
    @CurrentUser() user: any,
    @Body() updateBarberDto: UpdateBarberDto,
  ): Promise<BarberResponseDto> {
    return this.barbersService.updateBarber(user.userId, updateBarberDto);
  }

  @Get("search")
  @ApiOperation({ summary: "Search barbers by location and filters" })
  @ApiResponse({ status: 200, description: "Barbers found successfully" })
  async searchBarbers(@Query() searchDto: SearchBarbersDto) {
    return this.barbersService.searchBarbers(searchDto);
  }

  @Get("nearby")
  @ApiOperation({ summary: "Get nearby online barbers" })
  @ApiResponse({
    status: 200,
    description: "Nearby barbers retrieved successfully",
    type: [BarberResponseDto],
  })
  @ApiQuery({ name: "latitude", type: Number, description: "Latitude" })
  @ApiQuery({ name: "longitude", type: Number, description: "Longitude" })
  @ApiQuery({
    name: "radius",
    type: Number,
    description: "Search radius in kilometers",
    required: false,
  })
  @ApiQuery({
    name: "type",
    type: String,
    required: false,
    description: "Type of response: light | full (default: light)",
  })
  async getNearbyBarbers(
    @Query("latitude", ParseFloatPipe) latitude: number,
    @Query("longitude", ParseFloatPipe) longitude: number,
    @Query("radius", new DefaultValuePipe(10), ParseFloatPipe) radius: number,
    @Query("type") type: "light" | "full" = "light",
  ): Promise<BarberResponseDto[]> {
    return this.barbersService.getNearbyBarbers(
      latitude,
      longitude,
      radius,
      type,
    );
  }

  @Get()
  @ApiOperation({ summary: "Get all barbers" })
  @ApiResponse({ status: 200, description: "Barbers retrieved successfully" })
  async getAllBarbers(@Query() paginationDto: PaginationDto) {
    return this.barbersService.getAllBarbers(
      paginationDto.page,
      paginationDto.limit,
    );
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current barber profile" })
  @ApiResponse({
    status: 200,
    description: "Barber profile retrieved successfully",
    type: BarberResponseDto,
  })
  async getMyProfile(@CurrentUser() user: any): Promise<BarberResponseDto> {
    return this.barbersService.getBarberByUserId(user.userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get barber by ID" })
  @ApiParam({ name: "id", description: "Barber ID" })
  @ApiResponse({
    status: 200,
    description: "Barber retrieved successfully",
    type: BarberResponseDto,
  })
  async getBarberById(@Param("id") id: string): Promise<BarberResponseDto> {
    return this.barbersService.getBarberById(id);
  }

  @Put("status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BARBER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update barber online status" })
  @ApiResponse({
    status: 200,
    description: "Status updated successfully",
    type: BarberResponseDto,
  })
  async updateStatus(
    @CurrentUser() user: any,
    @Body() body: { isOnline: boolean },
  ): Promise<BarberResponseDto> {
    return this.barbersService.updateBarberStatus(user.userId, body.isOnline);
  }

  @Get("by-service/:serviceId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
    @ApiBearerAuth()
  @ApiParam({ name: "serviceId", description: "Service ID" })
  @ApiResponse({
    status: 200,
    description: "Status updated successfully",
    type: BarberResponseDto,
  })
  async getBarbersByService(@Param("serviceId") serviceId: string) {
    return this.barbersService.getBarbersByService(serviceId);
  }
}
