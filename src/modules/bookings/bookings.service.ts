import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Booking, BookingDocument, BookingStatus } from '../../schemas/booking.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { Barber, BarberDocument } from '../../schemas/barber.schema';
import { CreateBookingDto, UpdateBookingDto, BookingQueryDto, BookingResponseDto } from '../../dto/bookings/booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Barber.name) private barberModel: Model<BarberDocument>,
  ) {}

  async createBooking(customerId: string, createBookingDto: CreateBookingDto): Promise<BookingResponseDto> {
    const { barberId, services, scheduledAt, type, location, specialRequests, customerNotes, promoCodeId } = createBookingDto;

    console.log("barberId", barberId)
    // Validate barber exists and is active
    const barber = await this.barberModel.findById(barberId);
    console.log("barber", barber)
    if (!barber || !barber.isActive) {
      throw new NotFoundException('Barber not found or inactive');
    }

    // Validate customer exists
    const customer = await this.userModel.findById(customerId);
    if (!customer || !customer.isActive) {
      throw new NotFoundException('Customer not found or inactive');
    }

    // Check if barber is available at the scheduled time
    const isAvailable = await this.checkBarberAvailability(barberId, new Date(scheduledAt));
    if (!isAvailable) {
      throw new BadRequestException('Barber is not available at the scheduled time');
    }

    // Calculate total amount
    const totalAmount = services.reduce((sum, service) => sum + service.price, 0);
    const commission = totalAmount * barber.commissionRate;
    const payoutAmount = totalAmount - commission;

    // Create booking
    const booking = new this.bookingModel({
      customerId,
      barberId,
      services,
      scheduledAt: new Date(scheduledAt),
      type,
      location: location ? {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
        address: location.address,
        city: location.city,
        postalCode: location.postalCode,
        country: location.country,
      } : undefined,
      specialRequests,
      customerNotes,
      promoCodeId,
      payment: {
        status: 'pending',
        amount: totalAmount,
        currency: 'USD',
        commission,
        payoutAmount,
      },
      source: 'mobile_app',
    });

    await booking.save();

    // TODO: Send notifications to barber
    // TODO: Process payment if instant booking
    // TODO: Apply promo code if provided

    return this.mapToResponseDto(booking);
  }

  async updateBooking(bookingId: string, updateBookingDto: UpdateBookingDto, userId: string, userRole: string): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check permissions
    if (userRole !== 'admin' && booking.customerId.toString() !== userId && booking.barberId.toString() !== userId) {
      throw new ForbiddenException('Not authorized to update this booking');
    }

    // Update booking
    const updatedBooking = await this.bookingModel.findByIdAndUpdate(
      bookingId,
      { $set: updateBookingDto },
      { new: true }
    ).exec();

    return this.mapToResponseDto(updatedBooking);
  }

  async cancelBooking(bookingId: string, userId: string, userRole: string, reason?: string): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check permissions
    if (userRole !== 'admin' && booking.customerId.toString() !== userId && booking.barberId.toString() !== userId) {
      throw new ForbiddenException('Not authorized to cancel this booking');
    }

    // Check if booking can be cancelled
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed booking');
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

  async getBookingById(bookingId: string, userId: string, userRole: string): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check permissions
    if (userRole !== 'admin' && booking.customerId.toString() !== userId && booking.barberId.toString() !== userId) {
      throw new ForbiddenException('Not authorized to view this booking');
    }

    return this.mapToResponseDto(booking);
  }

  async getBookings(query: BookingQueryDto, userId: string, userRole: string): Promise<{
    bookings: BookingResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { status, type, startDate, endDate, barberId, customerId, page = 1, limit = 10, sortBy = 'scheduledAt', sortOrder = 'desc' } = query;

    // Build filter
    const filter: any = {};

    if (userRole === 'customer') {
      filter.customerId = userId;
    } else if (userRole === 'barber') {
      filter.barberId = userId;
    } else if (userRole === 'admin') {
      // Admin can see all bookings
      if (barberId) filter.barberId = barberId;
      if (customerId) filter.customerId = customerId;
    }

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (startDate) filter.scheduledAt = { $gte: new Date(startDate) };
    if (endDate) {
      filter.scheduledAt = { ...filter.scheduledAt, $lte: new Date(endDate) };
    }

    const skip = (page - 1) * limit;
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [bookings, total] = await Promise.all([
      this.bookingModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.bookingModel.countDocuments(filter).exec(),
    ]);

    return {
      bookings: bookings.map(booking => this.mapToResponseDto(booking)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async acceptBooking(bookingId: string, barberId: string): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.barberId.toString() !== barberId) {
      throw new ForbiddenException('Not authorized to accept this booking');
    }

    if (booking.status !== BookingStatus.REQUESTED) {
      throw new BadRequestException('Booking cannot be accepted in current status');
    }

    booking.status = BookingStatus.ACCEPTED;
    await booking.save();

    // TODO: Send notification to customer
    // TODO: Process payment

    return this.mapToResponseDto(booking);
  }

  async startBooking(bookingId: string, barberId: string): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.barberId.toString() !== barberId) {
      throw new ForbiddenException('Not authorized to start this booking');
    }

    if (booking.status !== BookingStatus.ACCEPTED) {
      throw new BadRequestException('Booking must be accepted before starting');
    }

    booking.status = BookingStatus.IN_PROGRESS;
    booking.startedAt = new Date();
    await booking.save();

    // TODO: Send notification to customer

    return this.mapToResponseDto(booking);
  }

  async completeBooking(bookingId: string, barberId: string, barberNotes?: string): Promise<BookingResponseDto> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.barberId.toString() !== barberId) {
      throw new ForbiddenException('Not authorized to complete this booking');
    }

    if (booking.status !== BookingStatus.IN_PROGRESS) {
      throw new BadRequestException('Booking must be in progress to complete');
    }

    booking.status = BookingStatus.COMPLETED;
    booking.completedAt = new Date();
    booking.barberNotes = barberNotes;

    // Update payment status
    booking.payment.status = 'completed';

    await booking.save();

    // TODO: Process payout to barber
    // TODO: Send notification to customer
    // TODO: Request review

    return this.mapToResponseDto(booking);
  }

  private async checkBarberAvailability(barberId: string, scheduledAt: Date): Promise<boolean> {
    // Check if there are any conflicting bookings
    const conflictingBooking = await this.bookingModel.findOne({
      barberId,
      scheduledAt: {
        $gte: new Date(scheduledAt.getTime() - 30 * 60 * 1000), // 30 minutes before
        $lte: new Date(scheduledAt.getTime() + 30 * 60 * 1000), // 30 minutes after
      },
      status: { $in: [BookingStatus.REQUESTED, BookingStatus.ACCEPTED, BookingStatus.IN_PROGRESS] },
    });

    return !conflictingBooking;
  }

  private mapToResponseDto(booking: BookingDocument): BookingResponseDto {
    return {
      id: booking._id.toString(),
      customerId: booking.customerId.toString(),
      barberId: booking.barberId.toString(),
      services: booking.services.map(service => ({
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
}
