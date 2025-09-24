import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

export enum ConversationType {
  BOOKING = 'booking',
  SUPPORT = 'support',
  GENERAL = 'general',
}

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  barberId: Types.ObjectId;

  @Prop({ 
    type: String, 
    enum: Object.values(ConversationType), 
    default: ConversationType.BOOKING 
  })
  type: ConversationType;

  @Prop({ type: Types.ObjectId, ref: 'Booking' })
  bookingId?: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastMessageAt?: Date;

  @Prop()
  lastMessage?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  lastMessageBy?: Types.ObjectId;

  // Read status for each participant
  @Prop({
    type: {
      customer: {
        lastReadAt: Date,
        unreadCount: { type: Number, default: 0 },
      },
      barber: {
        lastReadAt: Date,
        unreadCount: { type: Number, default: 0 },
      },
    },
    default: {},
  })
  readStatus: {
    customer: {
      lastReadAt?: Date;
      unreadCount: number;
    };
    barber: {
      lastReadAt?: Date;
      unreadCount: number;
    };
  };

  // Conversation metadata
  @Prop()
  title?: string;

  @Prop()
  description?: string;

  @Prop([String])
  tags: string[];

  @Prop({ default: false })
  isArchived: boolean;

  @Prop()
  archivedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  archivedBy?: Types.ObjectId;

  // Support conversation specific
  @Prop()
  priority?: string; // 'low', 'medium', 'high', 'urgent'

  @Prop()
  status?: string; // 'open', 'pending', 'resolved', 'closed'

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId; // Support agent
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Indexes
ConversationSchema.index({ customerId: 1, barberId: 1 });
ConversationSchema.index({ bookingId: 1 });
ConversationSchema.index({ isActive: 1, lastMessageAt: -1 });
ConversationSchema.index({ type: 1, status: 1 });
ConversationSchema.index({ 'readStatus.customer.unreadCount': 1 });
ConversationSchema.index({ 'readStatus.barber.unreadCount': 1 });
