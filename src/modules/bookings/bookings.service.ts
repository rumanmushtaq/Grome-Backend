import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  Booking,
  BookingDocument,
  BookingStatus,
} from "../../schemas/booking.schema";
import { User, UserDocument } from "../../schemas/user.schema";
import { Barber, BarberDocument } from "../../schemas/barber.schema";
import {
  CreateBookingDto,
  UpdateBookingDto,
  BookingQueryDto,
  BookingResponseDto,
} from "../../dto/bookings/booking.dto";
import { GetBarberAvailabilityDto } from "./dtos/booking.dto";
import * as moment from "moment";

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Barber.name) private barberModel: Model<BarberDocument>
  ) {}

  async createBooking(
    customerId: string,
    createBookingDto: CreateBookingDto
  ): Promise<BookingResponseDto> {
    const {
      barberId,
      services,
      scheduledAt,
      type,
      location,
      specialRequests,
      customerNotes,
      promoCodeId,
    } = createBookingDto;

    console.log("barberId", barberId);
    // Validate barber exists and is active
    const barber = await this.barberModel.findById(barberId);
    console.log("barber", barber);
    if (!barber || !barber.isActive) {
      throw new NotFoundException("Barber not found or inactive");
    }

    // Validate customer exists
    const customer = await this.userModel.findById(customerId);
    if (!customer || !customer.isActive) {
      throw new NotFoundException("Customer not found or inactive");
    }

    // Check if barber is available at the scheduled time
    const isAvailable = await this.checkBarberAvailability(
      barberId,
      new Date(scheduledAt)
    );
    if (!isAvailable) {
      throw new BadRequestException(
        "Barber is not available at the scheduled time"
      );
    }

    // Calculate total amount
    const totalAmount = services.reduce(
      (sum, service) => sum + service.price,
      0
    );
    const commission = totalAmount * barber.commissionRate;
    const payoutAmount = totalAmount - commission;

    // Create booking
    const booking = new this.bookingModel({
      customerId,
      barberId,
      services,
      scheduledAt: new Date(scheduledAt),
      type,
      location: location
        ? {
            type: "Point",
            coordinates: [location.longitude, location.latitude],
            address: location.address,
            city: location.city,
            postalCode: location.postalCode,
            country: location.country,
          }
        : undefined,
      specialRequests,
      customerNotes,
      promoCodeId,
      payment: {
        status: "pending",
        amount: totalAmount,
        currency: "USD",
        commission,
        payoutAmount,
      },
      source: "mobile_app",
    });

    await booking.save();

    // TODO: Send notifications to barber
    // TODO: Process payment if instant booking
    // TODO: Apply promo code if provided

    return this.mapToResponseDto(booking);
  }

  async updateBooking(
    bookingId: string,
    updateBookingDto: UpdateBookingDto,
    userId: string,
    userRole: string
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // Check permissions
    if (
      userRole !== "admin" &&
      booking.customerId.toString() !== userId &&
      booking.barberId.toString() !== userId
    ) {
      throw new ForbiddenException("Not authorized to update this booking");
    }

    // Update booking
    const updatedBooking = await this.bookingModel
      .findByIdAndUpdate(bookingId, { $set: updateBookingDto }, { new: true })
      .exec();

    return this.mapToResponseDto(updatedBooking);
  }

  async cancelBooking(
    bookingId: string,
    userId: string,
    userRole: string,
    reason?: string
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // Check permissions
    if (
      userRole !== "admin" &&
      booking.customerId.toString() !== userId &&
      booking.barberId.toString() !== userId
    ) {
      throw new ForbiddenException("Not authorized to cancel this booking");
    }

    // Check if booking can be cancelled
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException("Booking is already cancelled");
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException("Cannot cancel a completed booking");
    }

    // Update booking status
    booking.status = BookingStatus.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason;

    await booking.save();

    // TODO: Process refund if payment was made
    // TODO: Send notifications

    return this.mapToResponseDto(booking);
  }

  async getBookingById(
    bookingId: string,
    userId: string,
    userRole: string
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    // Check permissions
    if (
      userRole !== "admin" &&
      booking.customerId.toString() !== userId &&
      booking.barberId.toString() !== userId
    ) {
      throw new ForbiddenException("Not authorized to view this booking");
    }

    return this.mapToResponseDto(booking);
  }

  async getBookings(query: BookingQueryDto, userId: string, userRole: string) {
    const {
      status,
      type,
      startDate,
      endDate,
      barberId,
      customerId,
      page = 1,
      limit = 10,
      sortBy = "scheduledAt",
      sortOrder = "desc",
    } = query;

    const filter: any = {};

    // Role-based filtering
    if (userRole === "customer") filter.customerId = new Types.ObjectId(userId);
    if (userRole === "barber") filter.barberId = new Types.ObjectId(userId);
    if (userRole === "admin") {
      if (barberId) filter.barberId = new Types.ObjectId(barberId);
      if (customerId) filter.customerId = new Types.ObjectId(customerId);
    }

    if (status) filter.status = status;
    if (type) filter.type = type;

    if (startDate) filter.scheduledAt = { $gte: new Date(startDate) };
    if (endDate)
      filter.scheduledAt = {
        ...filter.scheduledAt,
        $lte: new Date(endDate),
      };

    const skip = (page - 1) * limit;

    const sort: any = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const basePipeline = [
      {
        $addFields: {
          customerId: { $toObjectId: "$customerId" },
          barberId: { $toObjectId: "$barberId" },
        },
      },
      { $match: filter },
    ];

    // 🔹 Fetch bookings
    const bookings = await this.bookingModel.aggregate([
      ...basePipeline,
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },

      {
        $lookup: {
          from: "users",
          localField: "customerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "barbers",
          localField: "barberId",
          foreignField: "_id",
          as: "barber",
        },
      },
      { $unwind: { path: "$barber", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "users",
          localField: "barber.userId",
          foreignField: "_id",
          as: "barberUser",
        },
      },
      { $unwind: { path: "$barberUser", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "services",
          localField: "services.serviceId",
          foreignField: "_id",
          as: "bookingServices",
        },
      },
    ]);

    // 🔹 Count using SAME pipeline
    const countResult = await this.bookingModel.aggregate([
      ...basePipeline,
      { $count: "total" },
    ]);

    const total = countResult[0]?.total || 0;

    return {
      bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async acceptBooking(
    bookingId: string,
    barberId: string
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.barberId.toString() !== barberId) {
      throw new ForbiddenException("Not authorized to accept this booking");
    }

    if (booking.status !== BookingStatus.REQUESTED) {
      throw new BadRequestException(
        "Booking cannot be accepted in current status"
      );
    }

    booking.status = BookingStatus.ACCEPTED;
    await booking.save();

    // TODO: Send notification to customer
    // TODO: Process payment

    return this.mapToResponseDto(booking);
  }

  async startBooking(
    bookingId: string,
    barberId: string
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.barberId.toString() !== barberId) {
      throw new ForbiddenException("Not authorized to start this booking");
    }

    if (booking.status !== BookingStatus.ACCEPTED) {
      throw new BadRequestException("Booking must be accepted before starting");
    }

    booking.status = BookingStatus.IN_PROGRESS;
    booking.startedAt = new Date();
    await booking.save();

    // TODO: Send notification to customer

    return this.mapToResponseDto(booking);
  }

  async completeBooking(
    bookingId: string,
    barberId: string,
    barberNotes?: string
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (booking.barberId.toString() !== barberId) {
      throw new ForbiddenException("Not authorized to complete this booking");
    }

    if (booking.status !== BookingStatus.IN_PROGRESS) {
      throw new BadRequestException("Booking must be in progress to complete");
    }

    booking.status = BookingStatus.COMPLETED;
    booking.completedAt = new Date();
    booking.barberNotes = barberNotes;

    // Update payment status
    booking.payment.status = "completed";

    await booking.save();

    // TODO: Process payout to barber
    // TODO: Send notification to customer
    // TODO: Request review

    return this.mapToResponseDto(booking);
  }

  private async checkBarberAvailability(
    barberId: string,
    scheduledAt: Date
  ): Promise<boolean> {
    // Check if there are any conflicting bookings
    const conflictingBooking = await this.bookingModel.findOne({
      barberId,
      scheduledAt: {
        $gte: new Date(scheduledAt.getTime() - 30 * 60 * 1000), // 30 minutes before
        $lte: new Date(scheduledAt.getTime() + 30 * 60 * 1000), // 30 minutes after
      },
      status: {
        $in: [
          BookingStatus.REQUESTED,
          BookingStatus.ACCEPTED,
          BookingStatus.IN_PROGRESS,
        ],
      },
    });

    return !conflictingBooking;
  }

  private mapToResponseDto(booking: BookingDocument): BookingResponseDto {
    return {
      id: booking._id.toString(),
      customerId: booking.customerId.toString(),
      barberId: booking.barberId.toString(),
      services: booking.services.map((service) => ({
        ...service,
        serviceId: service.serviceId.toString(),
      })),
      scheduledAt: booking.scheduledAt,
      status: booking.status,
      type: booking.type,
      location: booking.location,
      eta: booking.eta,
      startedAt: booking.startedAt,
      completedAt: booking.completedAt,
      cancelledAt: booking.cancelledAt,
      cancellationReason: booking.cancellationReason,
      payment: booking.payment,
      specialRequests: booking.specialRequests,
      customerNotes: booking.customerNotes,
      barberNotes: booking.barberNotes,
      promoCodeId: booking.promoCodeId?.toString(),
      discountAmount: booking.discountAmount,
      customerRating: booking.customerRating,
      customerReview: booking.customerReview,
      barberRating: booking.barberRating,
      barberReview: booking.barberReview,
      conversationId: booking.conversationId?.toString(),
      source: booking.source,
      isRecurring: booking.isRecurring,
      recurringPattern: booking.recurringPattern,
      recurringEndDate: booking.recurringEndDate,
      createdAt: (booking as any).createdAt,
      updatedAt: (booking as any).updatedAt,
    };
  }

  async getTopBarbers() {
    try {
      const topBarbers = await this.barberModel.aggregate([
        // Only completed appointments
        { $match: { status: "completed" } },

        // Group by barber
        {
          $group: {
            _id: "$barber", // barberId
            totalAppointments: { $sum: 1 },
            avgRating: { $avg: "$rating" },
            servicesUsed: { $push: "$services" }, // all services arrays
          },
        },

        // Lookup barber details from user collection
        {
          $lookup: {
            from: "users", // collection name
            localField: "_id",
            foreignField: "_id",
            as: "barber",
          },
        },

        // Flatten barber object
        { $unwind: "$barber" },

        // Format response fields
        {
          $project: {
            _id: 0,
            barberId: "$barber._id",
            name: "$barber.name",
            email: "$barber.email",
            image: "$barber.image",
            totalAppointments: 1,
            avgRating: { $ifNull: ["$avgRating", 0] },
            services: {
              $reduce: {
                input: "$servicesUsed",
                initialValue: [],
                in: { $concatArrays: ["$$value", "$$this"] },
              },
            },
          },
        },

        // Flatten duplicate services
        {
          $project: {
            barberId: 1,
            name: 1,
            email: 1,
            image: 1,
            totalAppointments: 1,
            avgRating: 1,
            services: {
              $setUnion: "$services", // remove duplicates
            },
          },
        },

        // Sort by completed appointments
        { $sort: { totalAppointments: -1 } },

        // Top 5 barbers
        { $limit: 5 },
      ]);

      return {
        success: true,
        data: topBarbers,
      };
    } catch (error) {
      console.error("Error fetching top barbers:", error);
      throw new InternalServerErrorException("Failed to fetch top barbers");
    }
  }

  async getTodayAppointments() {
    try {
      const now = new Date();

      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      );

      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );

      const appointments = await this.bookingModel.aggregate([
        {
          $match: {
            scheduledAt: { $gte: startOfDay, $lte: endOfDay },
            status: { $ne: "cancelled" },
          },
        },

        // Convert IDs to ObjectId if stored as string
        {
          $addFields: {
            customerId: { $toObjectId: "$customerId" },
            barberId: { $toObjectId: "$barberId" },
          },
        },

        // Customer Lookup
        {
          $lookup: {
            from: "users",
            localField: "customerId",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },

        // Barber Lookup
        {
          $lookup: {
            from: "barbers", // make sure this is correct name!
            localField: "barberId",
            foreignField: "_id",
            as: "barber",
          },
        },
        { $unwind: { path: "$barber", preserveNullAndEmptyArrays: true } },

        // Barber → User Lookup
        {
          $lookup: {
            from: "users",
            localField: "barber.userId",
            foreignField: "_id",
            as: "barberUser",
          },
        },
        { $unwind: { path: "$barberUser", preserveNullAndEmptyArrays: true } },

        {
          $project: {
            _id: 1,

            scheduledAt: 1,
            services: 1,
            status: 1,
            price: 1,
            customer: {
              _id: 1,
              name: 1,
              email: 1,
              phone: 1,
            },
            barberUser: {
              _id: 1,
              name: 1,
              email: 1,
              phone: 1,
            },
            // keep this temporarily for debugging
            barber: {
              _id: 1,
              userId: 1,
            },
          },
        },
      ]);

      return {
        success: true,
        count: appointments.length,
        data: appointments,
      };
    } catch (error) {
      console.error("Error fetching today's appointments:", error);
      return {
        success: false,
        message: "Failed to fetch today's appointments",
        error: error instanceof Error ? error.message : error,
      };
    }
  }

  async getAvailability(dto: GetBarberAvailabilityDto) {
    const { barberId, date, duration } = dto;

    const dayOfWeek = moment(date).format("dddd").toLowerCase();

    // Fetch barber
    const barber = await this.barberModel.findById(barberId).lean();
    if (
      !barber ||
      !barber.availability ||
      !barber.availability[dayOfWeek]?.isAvailable
    ) {
      return {
        success: false,
        message: "Barber not available on this day",
        availableSlots: [],
      };
    }

    const { startTime, endTime } = barber.availability[dayOfWeek];

    const start = moment(`${date} ${startTime}`, "YYYY-MM-DD HH:mm");
    const end = moment(`${date} ${endTime}`, "YYYY-MM-DD HH:mm");

    // Fetch bookings for the day
    const bookings = await this.bookingModel
      .find({
        barberId,
        status: { $ne: "cancelled" },
        scheduledAt: { $gte: start.toDate(), $lte: end.toDate() },
      })
      .lean();

    // Precompute occupied slots with real durations
    const occupiedSlots = bookings.map((booking) => {
      const bookingStart = moment(booking.scheduledAt);
      const totalDuration = booking.services.reduce(
        (sum: number, s: any) => sum + s.duration,
        0
      );
      const bookingEnd = bookingStart.clone().add(totalDuration, "minutes");
      return { start: bookingStart, end: bookingEnd };
    });

    const slots: string[] = [];
    const current = start.clone();

    // Loop until the last possible slot that fits within endTime
    while (current.isSameOrBefore(end.clone().subtract(duration, "minutes"))) {
      const slotStart = current.clone();
      const slotEnd = current.clone().add(duration, "minutes");

      // Check if this slot overlaps with any existing booking
      const isBooked = occupiedSlots.some((b) => {
        return slotStart.isBefore(b.end) && slotEnd.isAfter(b.start);
      });

      if (!isBooked) {
        slots.push(slotStart.format("HH:mm"));
      }

      current.add(duration, "minutes"); // move to next slot
    }

    return {
      success: true,
      barberId,
      date,
      availableSlots: slots,
    };
  }
}
