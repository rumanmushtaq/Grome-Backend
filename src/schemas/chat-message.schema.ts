import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  LOCATION = 'location',
  SYSTEM = 'system',
}

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

@Schema({ timestamps: true })
export class ChatMessage {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true, index: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  fromUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  toUserId: Types.ObjectId;

  @Prop({ 
    type: String, 
    enum: Object.values(MessageType), 
    default: MessageType.TEXT 
  })
  type: MessageType;

  @Prop()
  message?: string;

  @Prop([{
    url: { type: String, required: true },
    filename: String,
    mimeType: String,
    size: Number,
    thumbnailUrl: String,
  }])
  attachments: Array<{
    url: string;
    filename?: string;
    mimeType?: string;
    size?: number;
    thumbnailUrl?: string;
  }>;

  // Location data
  @Prop({
    type: {
      latitude: Number,
      longitude: Number,
      address: String,
      name: String,
    },
  })
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    name?: string;
  };

  @Prop({ 
    type: String, 
    enum: Object.values(MessageStatus), 
    default: MessageStatus.SENT 
  })
  status: MessageStatus;

  @Prop()
  sentAt: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  readAt?: Date;

  @Prop()
  failedAt?: Date;

  @Prop()
  failureReason?: string;

  // Message threading/replies
  @Prop({ type: Types.ObjectId, ref: 'ChatMessage' })
  replyToMessageId?: Types.ObjectId;

  @Prop()
  isEdited: boolean;

  @Prop()
  editedAt?: Date;

  @Prop()
  originalMessage?: string;

  // Message reactions
  @Prop([{
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }])
  reactions: Array<{
    userId: Types.ObjectId;
    emoji: string;
    createdAt: Date;
  }>;

  // System message data
  @Prop()
  systemAction?: string; // 'booking_created', 'booking_cancelled', 'payment_completed', etc.

  @Prop({ type: Object })
  systemData?: Record<string, any>; // Additional data for system messages

  // Message metadata
  @Prop()
  clientMessageId?: string; // For deduplication

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  // Message encryption (if implemented)
  @Prop()
  isEncrypted: boolean;

  @Prop()
  encryptionKey?: string;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

// Indexes
ChatMessageSchema.index({ conversationId: 1, createdAt: -1 });
ChatMessageSchema.index({ fromUserId: 1, createdAt: -1 });
ChatMessageSchema.index({ toUserId: 1, status: 1 });
ChatMessageSchema.index({ sentAt: -1 });
ChatMessageSchema.index({ status: 1 });
ChatMessageSchema.index({ type: 1 });
ChatMessageSchema.index({ replyToMessageId: 1 });
ChatMessageSchema.index({ clientMessageId: 1 }, { unique: true, sparse: true });
