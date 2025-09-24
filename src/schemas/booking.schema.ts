import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookingDocument = Booking & Document;

export enum BookingStatus {
  REQUESTED = 'requested',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum BookingType {
  INSTANT = 'instant',
  SCHEDULED = 'scheduled',
}

@Schema({ timestamps: true })
export class Booking {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Barber', required: true, index: true })
  barberId: Types.ObjectId;

  @Prop([{
    serviceId: { type: Types.ObjectId, ref: 'Service', required: true },
    price: { type: Number, required: true, min: 0 },
    duration: { type: Number, required: true, min: 15 },
    name: { type: String, required: true },
  }])
  services: Array<{
    serviceId: Types.ObjectId;
    price: number;
    duration: number;
    name: string;
  }>;

  @Prop({ required: true })
  scheduledAt: Date;

  @Prop({ 
    type: String, 
    enum: Object.values(BookingStatus), 
    default: BookingStatus.REQUESTED,
    index: true 
  })
  status: BookingStatus;

  @Prop({ 
    type: String, 
    enum: Object.values(BookingType), 
    default: BookingType.SCHEDULED 
  })
  type: BookingType;

  // Location for the booking
  @Prop({
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: [Number],
  })
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };

  @Prop()
  address?: string;

  @Prop()
  city?: string;

  @Prop()
  postalCode?: string;

  @Prop()
  country?: string;

  // ETA and timing
  @Prop()
  eta?: Date;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancellationReason?: string;

  // Payment information
  @Prop({
    type: {
      status: { 
        type: String, 
        enum: ['pending', 'processing', 'completed', 'failed', 'refunded'], 
        default: 'pending' 
      },
      amount: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'USD' },
      stripePaymentId: String,
      stripePaymentIntentId: String,
      commission: { type: Number, default: 0, min: 0 },
      payoutAmount: { type: Number, default: 0, min: 0 },
      refundAmount: { type: Number, default: 0, min: 0 },
      refundReason: String,
      refundedAt: Date,
    },
    required: true,
  })
  payment: {
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
    amount: number;
    currency: string;
    stripePaymentId?: string;
    stripePaymentIntentId?: string;
    commission: number;
    payoutAmount: number;
    refundAmount: number;
    refundReason?: string;
    refundedAt?: Date;
  };

  // Special requests and notes
  @Prop()
  specialRequests?: string;

  @Prop()
  customerNotes?: string;

  @Prop()
  barberNotes?: string;

  // Promo code
  @Prop({ type: Types.ObjectId, ref: 'PromoCode' })
  promoCodeId?: Types.ObjectId;

  @Prop({ default: 0, min: 0 })
  discountAmount: number;

  // Rating and review
  @Prop({ min: 1, max: 5 })
  customerRating?: number;

  @Prop()
  customerReview?: string;

  @Prop({ min: 1, max: 5 })
  barberRating?: number;

  @Prop()
  barberReview?: string;

  @Prop()
  customerReviewedAt?: Date;

  @Prop()
  barberReviewedAt?: Date;

  // Communication
  @Prop({ type: Types.ObjectId, ref: 'Conversation' })
  conversationId?: Types.ObjectId;

  // Metadata
  @Prop()
  source: string; // 'mobile_app', 'web', 'api'

  @Prop()
  userAgent?: string;

  @Prop()
  ipAddress?: string;

  // Recurring booking
  @Prop({ type: Types.ObjectId, ref: 'Booking' })
  parentBookingId?: Types.ObjectId;

  @Prop([{ type: Types.ObjectId, ref: 'Booking' }])
  childBookingIds: Types.ObjectId[];

  @Prop()
  isRecurring: boolean;

  @Prop()
  recurringPattern?: string; // 'weekly', 'biweekly', 'monthly'

  @Prop()
  recurringEndDate?: Date;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

// Compound indexes for efficient queries
BookingSchema.index({ barberId: 1, scheduledAt: 1 });
BookingSchema.index({ customerId: 1, scheduledAt: -1 });
BookingSchema.index({ status: 1, scheduledAt: 1 });
BookingSchema.index({ type: 1, scheduledAt: 1 });
BookingSchema.index({ 'payment.status': 1 });
BookingSchema.index({ location: '2dsphere' });
BookingSchema.index({ createdAt: -1 });
BookingSchema.index({ isRecurring: 1, parentBookingId: 1 });
