import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RefreshTokenDocument = RefreshToken & Document;

@Schema({ timestamps: true })
export class RefreshToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  tokenHash: string;

  @Prop({ required: true })
  deviceId: string;

  @Prop()
  deviceName?: string;

  @Prop()
  deviceType?: string; // 'mobile', 'web', 'desktop'

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isRevoked: boolean;

  @Prop()
  revokedAt?: Date;

  @Prop()
  revokedBy?: Types.ObjectId;

  @Prop()
  revokedReason?: string;

  // Token rotation tracking
  @Prop({ type: Types.ObjectId, ref: 'RefreshToken' })
  replacedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'RefreshToken' })
  replaces?: Types.ObjectId;

  @Prop({ default: false })
  isRotated: boolean;

  @Prop()
  lastUsedAt?: Date;

  @Prop({ default: 0 })
  usageCount: number;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// Indexes
RefreshTokenSchema.index({ userId: 1, isRevoked: 1 });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RefreshTokenSchema.index({ deviceId: 1, userId: 1 });
