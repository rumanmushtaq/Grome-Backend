import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WalletDocument = Wallet & Document;

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
export class Wallet {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ default: 0, min: 0 })
  balance: number;

  @Prop({ default: 0, min: 0 })
  pendingBalance: number;

  @Prop({ default: 0, min: 0 })
  totalEarned: number;

  @Prop({ default: 0, min: 0 })
  totalSpent: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastTransactionAt?: Date;

  // Wallet limits and settings
  @Prop({ default: 10000, min: 0 }) // Maximum balance limit
  maxBalance: number;

  @Prop({ default: 1000, min: 0 }) // Daily transaction limit
  dailyTransactionLimit: number;

  @Prop({ default: 0, min: 0 })
  dailyTransactionAmount: number;

  @Prop()
  lastDailyReset: Date;

  // Bank account details for payouts
  @Prop({
    type: {
      bankName: String,
      accountNumber: String,
      routingNumber: String,
      accountHolderName: String,
      isVerified: { type: Boolean, default: false },
      verifiedAt: Date,
    },
  })
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    routingNumber: string;
    accountHolderName: string;
    isVerified: boolean;
    verifiedAt?: Date;
  };

  // Payout settings
  @Prop({ default: 50, min: 10 }) // Minimum payout amount
  minPayoutAmount: number;

  @Prop({ default: 'weekly' }) // 'daily', 'weekly', 'monthly'
  payoutFrequency: string;

  @Prop()
  nextPayoutDate?: Date;

  @Prop({ default: false })
  autoPayoutEnabled: boolean;

  // Security settings
  @Prop({ default: false })
  twoFactorEnabled: boolean;

  @Prop()
  pinHash?: string;

  @Prop({ default: 0 })
  failedPinAttempts: number;

  @Prop()
  pinLockedUntil?: Date;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);

// Indexes
WalletSchema.index({ userId: 1 }, { unique: true });
WalletSchema.index({ isActive: 1 });
WalletSchema.index({ balance: -1 });
WalletSchema.index({ totalEarned: -1 });
