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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";

import { BookingsService } from "./bookings.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  CreateBookingDto,
  UpdateBookingDto,
  BookingQueryDto,
  BookingResponseDto,
} from "../../dto/bookings/booking.dto";
import { UserRole } from "../../schemas/user.schema";
import { GetBarberAvailabilityDto } from "./dtos/booking.dto";

@ApiTags("bookings")
@Controller("bookings")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: "Create a new booking" })
  @ApiResponse({
    status: 201,
    description: "Booking created successfully",
    type: BookingResponseDto,
  })
  async createBooking(
    @CurrentUser() user: any,
    @Body() createBookingDto: CreateBookingDto
  ): Promise<BookingResponseDto> {
    return this.bookingsService.createBooking(user.userId, createBookingDto);
  }


  @Get("availability")
  @ApiQuery({ name: "barberId", required: true, type: String })
  @ApiQuery({
    name: "date",
    required: true,
    type: String,
    description: "YYYY-MM-DD",
  })
  @ApiQuery({
    name: "duration",
    required: true,
    type: Number,
    description: "Slot duration in minutes",
  })
  async getAvailability(@Query() dto: GetBarberAvailabilityDto) {
    return this.bookingsService.getAvailability(dto);
  }

  @Get("today-appointments")
  async getTodayAppointments() {
    return this.bookingsService.getTodayAppointments();
  }

  @Get("top-barbers")
  async getTopBarbers() {
    return this.bookingsService.getTopBarbers();
  }

  @Get()
  @ApiOperation({ summary: "Get user bookings" })
  @ApiResponse({ status: 200, description: "Bookings retrieved successfully" })
  async getBookings(@CurrentUser() user: any, @Query() query: BookingQueryDto) {
    return this.bookingsService.getBookings(query, user.userId, user.role);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get booking by ID" })
  @ApiParam({ name: "id", description: "Booking ID" })
  @ApiResponse({
    status: 200,
    description: "Booking retrieved successfully",
    type: BookingResponseDto,
  })
  async getBookingById(
    @Param("id") id: string,
    @CurrentUser() user: any
  ): Promise<BookingResponseDto> {
    return this.bookingsService.getBookingById(id, user.userId, user.role);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update booking" })
  @ApiParam({ name: "id", description: "Booking ID" })
  @ApiResponse({
    status: 200,
    description: "Booking updated successfully",
    type: BookingResponseDto,
  })
  async updateBooking(
    @Param("id") id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @CurrentUser() user: any
  ): Promise<BookingResponseDto> {
    return this.bookingsService.updateBooking(
      id,
      updateBookingDto,
      user.userId,
      user.role
    );
  }

  @Patch(":id/cancel")
  @ApiOperation({ summary: "Cancel booking" })
  @ApiParam({ name: "id", description: "Booking ID" })
  @ApiResponse({
    status: 200,
    description: "Booking cancelled successfully",
    type: BookingResponseDto,
  })
  async cancelBooking(
    @Param("id") id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any
  ): Promise<BookingResponseDto> {
    return this.bookingsService.cancelBooking(
      id,
      user.userId,
      user.role,
      body.reason
    );
  }

  @Patch(":id/accept")
  @Roles(UserRole.BARBER)
  @ApiOperation({ summary: "Accept booking (Barber only)" })
  @ApiParam({ name: "id", description: "Booking ID" })
  @ApiResponse({
    status: 200,
    description: "Booking accepted successfully",
    type: BookingResponseDto,
  })
  async acceptBooking(
    @Param("id") id: string,
    @CurrentUser() user: any
  ): Promise<BookingResponseDto> {
    return this.bookingsService.acceptBooking(id, user.userId);
  }

  @Patch(":id/start")
  @Roles(UserRole.BARBER)
  @ApiOperation({ summary: "Start booking (Barber only)" })
  @ApiParam({ name: "id", description: "Booking ID" })
  @ApiResponse({
    status: 200,
    description: "Booking started successfully",
    type: BookingResponseDto,
  })
  async startBooking(
    @Param("id") id: string,
    @CurrentUser() user: any
  ): Promise<BookingResponseDto> {
    return this.bookingsService.startBooking(id, user.userId);
  }

  @Patch(":id/complete")
  @Roles(UserRole.BARBER)
  @ApiOperation({ summary: "Complete booking (Barber only)" })
  @ApiParam({ name: "id", description: "Booking ID" })
  @ApiResponse({
    status: 200,
    description: "Booking completed successfully",
    type: BookingResponseDto,
  })
  async completeBooking(
    @Param("id") id: string,
    @Body() body: { barberNotes?: string },
    @CurrentUser() user: any
  ): Promise<BookingResponseDto> {
    return this.bookingsService.completeBooking(
      id,
      user.userId,
      body.barberNotes
    );
  }

  
}
