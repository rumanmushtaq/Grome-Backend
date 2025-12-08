import { Gender } from '@/modules/auth/enums/gender.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  CUSTOMER = 'customer',
  BARBER = 'barber',
  ADMIN = 'admin',
}

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class User {
  _id?: any;

  @Prop({ type: String, sparse: true})
  email?: string;

  @Prop({ type: String, sparse: true })
  phone?: string;

  @Prop({ required: false })
  passwordHash?: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  shopName?: string;

  @Prop({ 
    type: String, 
    enum: Object.values(UserRole), 
    default: UserRole.CUSTOMER 
  })
  role: UserRole;

  @Prop()
  avatarUrl?: string;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: false })
  isActive: boolean;

  @Prop()
  lastLoginAt?: Date;


  @Prop({ default: false })
  isDeleted: boolean;


 @Prop({ type: String, enum: Gender, default: Gender.OTHER })
  gender?: Gender;

  
  @Prop()
  emailVerifiedAt?: Date;

  @Prop()
  phoneVerifiedAt?: Date;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  phoneVerificationCode?: string;

  @Prop()
  phoneVerificationExpires?: Date;

  @Prop()
  phoneVerificationId?: string;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  // Social authentication
  @Prop({
    type: {
      provider: { type: String, enum: ['google', 'facebook', 'apple'] },
      providerId: String,
      providerEmail: String,
      providerName: String,
      providerAvatar: String,
    },
    default: {},
  })
  socialAuth?: {
    provider?: 'google' | 'facebook' | 'apple';
    providerId?: string;
    providerEmail?: string;
    providerName?: string;
    providerAvatar?: string;
  };

  // KYC verification for barbers
  @Prop({
    type: {
      status: { 
        type: String, 
        enum: Object.values(VerificationStatus), 
        default: VerificationStatus.PENDING 
      },
      idDocUrl: String,
      certificateUrls: [String],
      notes: String,
      submittedAt: Date,
      reviewedAt: Date,
      reviewedBy: { type: Types.ObjectId, ref: 'User' },
    },
    default: {},
  })
  verification: {
    status: VerificationStatus;
    idDocUrl?: string;
    certificateUrls?: string[];
    notes?: string;
    submittedAt?: Date;
    reviewedAt?: Date;
    reviewedBy?: Types.ObjectId;
  };

  // Preferences
  @Prop({
    type: {
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
      },
      language: { type: String, default: 'en' },
      timezone: { type: String, default: 'UTC' },
    },
    default: {},
  })
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    language: string;
    timezone: string;
  };
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes

