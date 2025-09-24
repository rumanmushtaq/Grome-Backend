import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Conversation, ConversationDocument } from '../../schemas/conversation.schema';
import { ChatMessage, ChatMessageDocument, MessageType, MessageStatus } from '../../schemas/chat-message.schema';
import { User, UserDocument } from '../../schemas/user.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(ChatMessage.name) private chatMessageModel: Model<ChatMessageDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async createConversation(customerId: string, barberId: string, bookingId?: string): Promise<ConversationDocument> {
    // Check if conversation already exists
    let conversation = await this.conversationModel.findOne({
      customerId,
      barberId,
      bookingId,
    });

    if (conversation) {
      return conversation;
    }

    // Create new conversation
    conversation = new this.conversationModel({
      customerId,
      barberId,
      bookingId,
      type: 'booking',
      isActive: true,
      readStatus: {
        customer: { unreadCount: 0 },
        barber: { unreadCount: 0 },
      },
    });

    await conversation.save();
    return conversation;
  }

  async getConversations(userId: string, page: number = 1, limit: number = 20): Promise<{
    conversations: ConversationDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      this.conversationModel
        .find({
          $or: [{ customerId: userId }, { barberId: userId }],
          isActive: true,
        })
        .populate('customerId', 'name avatarUrl')
        .populate('barberId', 'name avatarUrl')
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.conversationModel.countDocuments({
        $or: [{ customerId: userId }, { barberId: userId }],
        isActive: true,
      }),
    ]);

    return {
      conversations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getConversationById(conversationId: string, userId: string): Promise<ConversationDocument> {
    const conversation = await this.conversationModel
      .findOne({
        _id: conversationId,
        $or: [{ customerId: userId }, { barberId: userId }],
      })
      .populate('customerId', 'name avatarUrl')
      .populate('barberId', 'name avatarUrl')
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    messages: ChatMessageDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Verify user has access to conversation
    const hasAccess = await this.verifyConversationAccess(conversationId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to conversation');
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.chatMessageModel
        .find({ conversationId })
        .populate('fromUserId', 'name avatarUrl')
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.chatMessageModel.countDocuments({ conversationId }),
    ]);

    return {
      messages: messages.reverse(), // Return in chronological order
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createMessage(data: {
    conversationId: string;
    fromUserId: string;
    message?: string;
    type?: MessageType;
    attachments?: any[];
    clientMessageId?: string;
  }): Promise<ChatMessageDocument> {
    const { conversationId, fromUserId, message, type = MessageType.TEXT, attachments, clientMessageId } = data;

    // Verify user has access to conversation
    const hasAccess = await this.verifyConversationAccess(conversationId, fromUserId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to conversation');
    }

    // Get conversation to determine toUserId
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const toUserId = conversation.customerId.toString() === fromUserId 
      ? conversation.barberId 
      : conversation.customerId;

    // Create message
    const chatMessage = new this.chatMessageModel({
      conversationId,
      fromUserId,
      toUserId,
      type,
      message,
      attachments,
      status: MessageStatus.SENT,
      sentAt: new Date(),
      clientMessageId,
    });

    await chatMessage.save();

    // Update conversation last message
    await this.conversationModel.findByIdAndUpdate(conversationId, {
      lastMessage: message,
      lastMessageAt: new Date(),
      lastMessageBy: fromUserId,
    });

    // Update unread count for recipient
    const recipientField = conversation.customerId.toString() === fromUserId ? 'barber' : 'customer';
    await this.conversationModel.findByIdAndUpdate(conversationId, {
      $inc: { [`readStatus.${recipientField}.unreadCount`]: 1 },
    });

    return chatMessage.populate('fromUserId', 'name avatarUrl');
  }

  async markMessageAsRead(conversationId: string, messageId: string, userId: string): Promise<void> {
    const message = await this.chatMessageModel.findOne({
      _id: messageId,
      conversationId,
      toUserId: userId,
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.readAt) {
      return; // Already read
    }

    message.readAt = new Date();
    message.status = MessageStatus.READ;
    await message.save();
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    // Mark all unread messages as read
    await this.chatMessageModel.updateMany(
      {
        conversationId,
        toUserId: userId,
        readAt: { $exists: false },
      },
      {
        $set: {
          readAt: new Date(),
          status: MessageStatus.READ,
        },
      },
    );

    // Reset unread count
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) return;

    const userField = conversation.customerId.toString() === userId ? 'customer' : 'barber';
    await this.conversationModel.findByIdAndUpdate(conversationId, {
      $set: {
        [`readStatus.${userField}.unreadCount`]: 0,
        [`readStatus.${userField}.lastReadAt`]: new Date(),
      },
    });
  }

  async verifyConversationAccess(conversationId: string, userId: string): Promise<boolean> {
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
      $or: [{ customerId: userId }, { barberId: userId }],
    });

    return !!conversation;
  }

  async archiveConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
      $or: [{ customerId: userId }, { barberId: userId }],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    conversation.isArchived = true;
    conversation.archivedAt = new Date();
    conversation.archivedBy = new Types.ObjectId(userId);
    await conversation.save();
  }

  async unarchiveConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
      $or: [{ customerId: userId }, { barberId: userId }],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    conversation.isArchived = false;
    conversation.archivedAt = undefined;
    conversation.archivedBy = undefined;
    await conversation.save();
  }

  async getUnreadCount(userId: string): Promise<number> {
    const conversations = await this.conversationModel.find({
      $or: [{ customerId: userId }, { barberId: userId }],
      isActive: true,
    });

    let totalUnread = 0;
    for (const conversation of conversations) {
      const userField = conversation.customerId.toString() === userId ? 'customer' : 'barber';
      totalUnread += conversation.readStatus[userField].unreadCount;
    }

    return totalUnread;
  }

  async searchMessages(
    userId: string,
    query: string,
    conversationId?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    messages: ChatMessageDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // Build search filter
    const searchFilter: any = {
      $text: { $search: query },
    };

    if (conversationId) {
      searchFilter.conversationId = conversationId;
    } else {
      // Get user's conversations
      const userConversations = await this.conversationModel.find({
        $or: [{ customerId: userId }, { barberId: userId }],
        isActive: true,
      }).select('_id');

      searchFilter.conversationId = { $in: userConversations.map(c => c._id) };
    }

    const [messages, total] = await Promise.all([
      this.chatMessageModel
        .find(searchFilter)
        .populate('fromUserId', 'name avatarUrl')
        .populate('conversationId')
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.chatMessageModel.countDocuments(searchFilter),
    ]);

    return {
      messages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
