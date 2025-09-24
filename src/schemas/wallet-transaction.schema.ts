import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WalletTransactionDocument = WalletTransaction & Document;

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TransactionCategory {
  BOOKING_PAYMENT = 'booking_payment',
  BOOKING_REFUND = 'booking_refund',
  COMMISSION_EARNED = 'commission_earned',
  COMMISSION_DEDUCTED = 'commission_deducted',
  PAYOUT = 'payout',
  PROMO_CREDIT = 'promo_credit',
  REFERRAL_BONUS = 'referral_bonus',
  PENALTY = 'penalty',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer',
}

@Schema({ timestamps: true })
export class WalletTransaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Wallet', required: true, index: true })
  walletId: Types.ObjectId;

  @Prop({ 
    type: String, 
    enum: Object.values(TransactionType), 
    required: true,
    index: true 
  })
  type: TransactionType;

  @Prop({ 
    type: String, 
    enum: Object.values(TransactionStatus), 
    default: TransactionStatus.PENDING,
    index: true 
  })
  status: TransactionStatus;

  @Prop({ 
    type: String, 
    enum: Object.values(TransactionCategory), 
    required: true,
    index: true 
  })
  category: TransactionCategory;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  reference?: string; // External reference (e.g., Stripe payment ID)

  @Prop()
  externalId?: string; // External system transaction ID

  // Related entities
  @Prop({ type: Types.ObjectId, ref: 'Booking' })
  bookingId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  relatedUserId?: Types.ObjectId; // For transfers or referrals

  @Prop({ type: Types.ObjectId, ref: 'PromoCode' })
  promoCodeId?: Types.ObjectId;

  // Balance tracking
  @Prop({ required: true })
  balanceBefore: number;

  @Prop({ required: true })
  balanceAfter: number;

  // Transaction metadata
  @Prop()
  metadata?: any;

  @Prop()
  notes?: string;

  @Prop()
  processedAt?: Date;

  @Prop()
  failedAt?: Date;

  @Prop()
  failureReason?: string;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancellationReason?: string;

  // Fee information
  @Prop({ default: 0, min: 0 })
  feeAmount: number;

  @Prop()
  feeDescription?: string;

  // Reversal information
  @Prop({ type: Types.ObjectId, ref: 'WalletTransaction' })
  reversedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'WalletTransaction' })
  reverses?: Types.ObjectId;

  @Prop({ default: false })
  isReversed: boolean;

  @Prop()
  reversedAt?: Date;

  // Audit trail
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  processedBy?: Types.ObjectId;

  // Transaction hash for integrity
  @Prop()
  transactionHash?: string;

  // Batch processing
  @Prop()
  batchId?: string;

  @Prop()
  batchSequence?: number;
}

export const WalletTransactionSchema = SchemaFactory.createForClass(WalletTransaction);

// Indexes
WalletTransactionSchema.index({ userId: 1, createdAt: -1 });
WalletTransactionSchema.index({ walletId: 1, createdAt: -1 });
WalletTransactionSchema.index({ type: 1, status: 1 });
WalletTransactionSchema.index({ category: 1, createdAt: -1 });
WalletTransactionSchema.index({ bookingId: 1 });
WalletTransactionSchema.index({ reference: 1 });
WalletTransactionSchema.index({ externalId: 1 });
WalletTransactionSchema.index({ batchId: 1 });
WalletTransactionSchema.index({ transactionHash: 1 }, { unique: true, sparse: true });
