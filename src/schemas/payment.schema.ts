import { PaymentMethod, PaymentProvider, PaymentStatus } from '@/modules/payments/enums/payment.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  /* Relations */
//   @Prop({ type: Types.ObjectId, ref: 'Booking', required: true, index: true })
//   bookingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Barber', index: true })
  barberId: Types.ObjectId;

  /* Payment Info */
  @Prop({ enum: Object.values(PaymentProvider), default: PaymentProvider.STRIPE })
  provider: PaymentProvider;

  @Prop({ enum: Object.values(PaymentMethod), required: true })
  method: PaymentMethod;

  @Prop({
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
    index: true,
  })
  status: PaymentStatus;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ default: 'USD' })
  currency: string;

  /* Stripe / Provider IDs */
  @Prop({ index: true })
  stripePaymentIntentId?: string;

  @Prop()
  stripeChargeId?: string;

  @Prop({ index: true })
  providerTransactionId?: string;

  /* Method Details */
  @Prop({
    type: {
      brand: String,
      last4: String,
      expMonth: Number,
      expYear: Number,
      walletType: String,
      raw: { type: Object, default: {} },
    },
  })
  methodDetails?: {
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
    walletType?: string;
    raw?: Record<string, any>;
  };

  /* Platform Accounting */
  @Prop({ default: 0, min: 0 })
  commission: number;

  @Prop({ default: 0, min: 0 })
  payoutAmount: number;

  /* Refunds */
  @Prop({ default: 0, min: 0 })
  refundAmount: number;

  @Prop()
  refundReason?: string;

  @Prop()
  refundedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  refundedBy?: Types.ObjectId;

  /* Lifecycle Tracking */
  @Prop({ type: [{ at: Date, status: String, note: String }], default: [] })
  statusHistory?: Array<{
    at: Date;
    status: PaymentStatus;
    note?: string;
  }>;

  /* Receipts & Metadata */
  @Prop()
  receiptUrl?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

/* Indexes */
PaymentSchema.index({ bookingId: 1 });
PaymentSchema.index({ customerId: 1 });
PaymentSchema.index({ barberId: 1 });
PaymentSchema.index({ providerTransactionId: 1 });
PaymentSchema.index({ stripePaymentIntentId: 1 });
