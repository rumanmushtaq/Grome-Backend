import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BarberDocument = Barber & Document;

@Schema({ timestamps: true })
export class Barber {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  })
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };

  @Prop([{
    serviceId: { type: Types.ObjectId, ref: 'Service', required: true },
    price: { type: Number, required: true, min: 0 },
  }])
  services: Array<{
    serviceId: Types.ObjectId;
    price: number;
  }>;

  @Prop({ default: 0, min: 0, max: 5 })
  rating: number;

  @Prop({ default: 0, min: 0 })
  reviewsCount: number;

  @Prop({
    type: {
      monday: {
        isAvailable: { type: Boolean, default: true },
        startTime: { type: String, default: '09:00' },
        endTime: { type: String, default: '18:00' },
        breaks: [{
          startTime: String,
          endTime: String,
        }],
      },
      tuesday: {
        isAvailable: { type: Boolean, default: true },
        startTime: { type: String, default: '09:00' },
        endTime: { type: String, default: '18:00' },
        breaks: [{
          startTime: String,
          endTime: String,
        }],
      },
      wednesday: {
        isAvailable: { type: Boolean, default: true },
        startTime: { type: String, default: '09:00' },
        endTime: { type: String, default: '18:00' },
        breaks: [{
          startTime: String,
          endTime: String,
        }],
      },
      thursday: {
        isAvailable: { type: Boolean, default: true },
        startTime: { type: String, default: '09:00' },
        endTime: { type: String, default: '18:00' },
        breaks: [{
          startTime: String,
          endTime: String,
        }],
      },
      friday: {
        isAvailable: { type: Boolean, default: true },
        startTime: { type: String, default: '09:00' },
        endTime: { type: String, default: '18:00' },
        breaks: [{
          startTime: String,
          endTime: String,
        }],
      },
      saturday: {
        isAvailable: { type: Boolean, default: true },
        startTime: { type: String, default: '09:00' },
        endTime: { type: String, default: '18:00' },
        breaks: [{
          startTime: String,
          endTime: String,
        }],
      },
      sunday: {
        isAvailable: { type: Boolean, default: false },
        startTime: { type: String, default: '09:00' },
        endTime: { type: String, default: '18:00' },
        breaks: [{
          startTime: String,
          endTime: String,
        }],
      },
    },
    default: {},
  })
  availability: {
    monday: {
      isAvailable: boolean;
      startTime: string;
      endTime: string;
      breaks: Array<{ startTime: string; endTime: string }>;
    };
    tuesday: {
      isAvailable: boolean;
      startTime: string;
      endTime: string;
      breaks: Array<{ startTime: string; endTime: string }>;
    };
    wednesday: {
      isAvailable: boolean;
      startTime: string;
      endTime: string;
      breaks: Array<{ startTime: string; endTime: string }>;
    };
    thursday: {
      isAvailable: boolean;
      startTime: string;
      endTime: string;
      breaks: Array<{ startTime: string; endTime: string }>;
    };
    friday: {
      isAvailable: boolean;
      startTime: string;
      endTime: string;
      breaks: Array<{ startTime: string; endTime: string }>;
    };
    saturday: {
      isAvailable: boolean;
      startTime: string;
      endTime: string;
      breaks: Array<{ startTime: string; endTime: string }>;
    };
    sunday: {
      isAvailable: boolean;
      startTime: string;
      endTime: string;
      breaks: Array<{ startTime: string; endTime: string }>;
    };
  };

  @Prop({ min: 0 })
  experienceYears?: number;

  @Prop()
  description: string;

  @Prop([String])
  images: string[];

  @Prop([String])
  identificationDocuments: string[];

  @Prop()
  bio?: string;

  @Prop([String])
  specialties: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop()
  lastSeenAt?: Date;

  // Commission settings
  @Prop({ default: 0.1, min: 0, max: 1 }) // 10% default commission
  commissionRate: number;

  // Service area (radius in kilometers)
  @Prop({ default: 10, min: 1, max: 100 })
  serviceRadius: number;

  // Bank details for payouts
  @Prop({
    type: {
      bankName: String,
      accountNumber: String,
      routingNumber: String,
      accountHolderName: String,
      isVerified: { type: Boolean, default: false },
    },
  })
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    routingNumber: string;
    accountHolderName: string;
    isVerified: boolean;
  };
}

export const BarberSchema = SchemaFactory.createForClass(Barber);

// 2dsphere index for geospatial queries
BarberSchema.index({ location: '2dsphere' });

BarberSchema.index({ isActive: 1 });
BarberSchema.index({ isOnline: 1 });
BarberSchema.index({ rating: -1 });
BarberSchema.index({ reviewsCount: -1 });
