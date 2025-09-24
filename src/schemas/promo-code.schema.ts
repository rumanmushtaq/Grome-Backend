import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PromoCodeDocument = PromoCode & Document;

export enum PromoCodeType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  FREE_SERVICE = 'free_service',
}

export enum PromoCodeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  EXHAUSTED = 'exhausted',
}

@Schema({ timestamps: true })
export class PromoCode {
  @Prop({ required: true, unique: true, index: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ 
    type: String, 
    enum: Object.values(PromoCodeType), 
    required: true 
  })
  type: PromoCodeType;

  @Prop({ required: true, min: 0 })
  value: number; // Percentage (0-100) or fixed amount

  @Prop({ default: 0, min: 0 })
  maxDiscountAmount?: number; // Maximum discount for percentage type

  @Prop({ required: true, min: 0 })
  minOrderAmount: number; // Minimum order amount to use this code

  @Prop({ required: true, min: 1 })
  usageLimit: number; // Total number of times this code can be used

  @Prop({ default: 0, min: 0 })
  usedCount: number;

  @Prop({ min: 1 })
  usageLimitPerUser?: number; // Per user usage limit

  @Prop({ required: true })
  validFrom: Date;

  @Prop({ required: true })
  validUntil: Date;

  @Prop({ 
    type: String, 
    enum: Object.values(PromoCodeStatus), 
    default: PromoCodeStatus.ACTIVE,
    index: true 
  })
  status: PromoCodeStatus;

  @Prop([{ type: Types.ObjectId, ref: 'Service' }])
  applicableServices: Types.ObjectId[]; // Specific services this code applies to

  @Prop([{ type: Types.ObjectId, ref: 'User' }])
  applicableUsers: Types.ObjectId[]; // Specific users who can use this code

  @Prop([{ type: Types.ObjectId, ref: 'User' }])
  excludedUsers: Types.ObjectId[]; // Users who cannot use this code

  // Geographic restrictions
  @Prop([String])
  applicableCities: string[];

  @Prop([String])
  applicableCountries: string[];

  // User restrictions
  @Prop({ default: false })
  newUsersOnly: boolean; // Only for new users

  @Prop({ default: false })
  existingUsersOnly: boolean; // Only for existing users

  @Prop({ min: 0 })
  minBookingsRequired?: number; // Minimum number of bookings required

  @Prop({ min: 0 })
  maxBookingsAllowed?: number; // Maximum number of bookings allowed

  // Usage tracking
  @Prop([{
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    bookingId: { type: Types.ObjectId, ref: 'Booking', required: true },
    discountAmount: { type: Number, required: true, min: 0 },
    usedAt: { type: Date, default: Date.now },
  }])
  usageHistory: Array<{
    userId: Types.ObjectId;
    bookingId: Types.ObjectId;
    discountAmount: number;
    usedAt: Date;
  }>;

  // Campaign information
  @Prop()
  campaignId?: string;

  @Prop()
  campaignName?: string;

  @Prop()
  source?: string; // 'admin', 'referral', 'partnership', etc.

  // Analytics
  @Prop({ default: 0, min: 0 })
  totalDiscountGiven: number;

  @Prop({ default: 0, min: 0 })
  totalRevenueGenerated: number;

  @Prop()
  lastUsedAt?: Date;

  // Admin information
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  @Prop()
  notes?: string;

  // Auto-expiry settings
  @Prop({ default: false })
  autoExpire: boolean;

  @Prop()
  expiryAction?: string; // 'disable', 'delete', 'archive'
}

export const PromoCodeSchema = SchemaFactory.createForClass(PromoCode);

// Indexes
PromoCodeSchema.index({ code: 1 }, { unique: true });
PromoCodeSchema.index({ status: 1, validFrom: 1, validUntil: 1 });
PromoCodeSchema.index({ campaignId: 1 });
PromoCodeSchema.index({ createdBy: 1 });
PromoCodeSchema.index({ validFrom: 1, validUntil: 1 });
PromoCodeSchema.index({ 'usageHistory.userId': 1 });
PromoCodeSchema.index({ 'usageHistory.bookingId': 1 });
