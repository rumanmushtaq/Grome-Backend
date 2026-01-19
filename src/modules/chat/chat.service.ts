import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  forwardRef,
  Inject,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  Conversation,
  ConversationDocument,
  ConversationType,
} from "../../schemas/conversation.schema";
import {
  ChatMessage,
  ChatMessageDocument,
  MessageType,
  MessageStatus,
} from "../../schemas/chat-message.schema";
import { User, UserDocument } from "../../schemas/user.schema";
import { ChatGateway } from "./chat.gateway";

@Injectable()
export class ChatService {
  constructor(
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(ChatMessage.name)
    private chatMessageModel: Model<ChatMessageDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async createConversation(
    customerId: string,
    barberId: string,
    bookingId?: string,
  ): Promise<ConversationDocument> {
    // 1. Validate ObjectId Format (Prevents BSON error crashes)
    if (
      !Types.ObjectId.isValid(customerId) ||
      !Types.ObjectId.isValid(barberId)
    ) {
      throw new BadRequestException("Invalid Customer or Barber ID format");
    }

    if (bookingId && !Types.ObjectId.isValid(bookingId)) {
      throw new BadRequestException("Invalid Booking ID format");
    }

    try {
      const customerObjId = new Types.ObjectId(customerId);
      const barberObjId = new Types.ObjectId(barberId);
      const bookingObjId = bookingId
        ? new Types.ObjectId(bookingId)
        : undefined;

      // 2. Check for existing conversation
      // We use a lean query for performance since we only need to check existence
      const existingConversation = await this.conversationModel
        .findOne({
          customerId: customerObjId,
          barberId: barberObjId,
          ...(bookingObjId && { bookingId: bookingObjId }),
        })
        .exec();

      if (existingConversation) {
        return existingConversation;
      }

      // 3. Create new conversation
      const newConversation = new this.conversationModel({
        customerId: customerObjId,
        barberId: barberObjId,
        bookingId: bookingObjId,
        type: ConversationType.BOOKING,
        isActive: true,
        readStatus: {
          customer: { unreadCount: 0, lastReadAt: new Date() },
          barber: { unreadCount: 0, lastReadAt: new Date() },
        },
      });

      return await newConversation.save();
    } catch (error) {
      // 4. Specific Error Handling
      if (error.name === "ValidationError") {
        throw new BadRequestException(`Validation Error: ${error.message}`);
      }

      // Log the error for the developer
      console.error("Create Conversation Error:", error);

      throw new InternalServerErrorException(
        "An unexpected error occurred while creating the conversation",
      );
    }
  }

  async getConversations(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    conversations: ConversationDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const userObjectId = new Types.ObjectId(userId);

    const [conversations, total] = await Promise.all([
      this.conversationModel.aggregate([
        // 1️⃣ Only active conversations
        {
          $match: {
            isActive: true,
            $or: [{ customerId: userObjectId }, { barberId: userObjectId }],
          },
        },
        // 2️⃣ Join BARBER → BARBERS
        {
          $lookup: {
            from: "barbers",
            localField: "barberId",
            foreignField: "_id",
            as: "barber",
          },
        },
        { $unwind: "$barber" },

        // 5️⃣ Join CUSTOMER → USERS
        {
          $lookup: {
            from: "users",
            localField: "customerId",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: "$customer" },

        // 6️⃣ Join BARBER.userId → USERS
        {
          $lookup: {
            from: "users",
            localField: "barber.userId",
            foreignField: "_id",
            as: "barberUser",
          },
        },
        {
          $unwind: {
            path: "$barberUser",
            preserveNullAndEmptyArrays: true,
          },
        },

        // 4️⃣ Sort
        {
          $sort: { lastMessageAt: -1 },
        },
        { $skip: skip },
        { $limit: limit },
        // 6️⃣ PROJECT specific fields
      {
        $project: {
          _id: 1,
          type: 1,
          bookingId: 1,
          lastMessage: 1,
          lastMessageAt: 1,
          readStatus: 1,
          // Project specific Customer fields
          customer: {
            _id: 1,
            name: 1,
            avatarUrl: 1,
            phone: 1,
          },
          // Project specific Barber data
          barber: {
            _id: 1,
            shopName: 1,
            images: 1,
            rating: 1,
          },
          // Project specific Barber User info (from the users collection)
          barberUser: {
            _id: 1,
            name: 1,
            avatarUrl: 1,
          }
        }
      },
      ]),
      this.conversationModel.countDocuments({
        $or: [{ customerId: userObjectId }, { barberId: userObjectId }],
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

  async getConversationById(
    conversationId: string,
    userId: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel
      .findOne({
        _id: conversationId,
        $or: [{ customerId: userId }, { barberId: userId }],
      })
      .populate("customerId", "name avatarUrl")
      .populate("barberId", "name avatarUrl")
      .exec();

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
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
    try {
      // ✅ Validate inputs
      if (!conversationId) {
        throw new BadRequestException("Conversation ID is required");
      }

      if (!userId) {
        throw new BadRequestException("User ID is required");
      }

      if (page < 1 || limit < 1) {
        throw new BadRequestException(
          "Page and limit must be positive numbers",
        );
      }

      // Verify user has access to conversation
      const hasAccess = await this.verifyConversationAccess(
        conversationId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException("Access denied to conversation");
      }

      const skip = (page - 1) * limit;

      const [messages, total] = await Promise.all([
        this.chatMessageModel
          .find({ conversationId })
          .populate("fromUserId", "name avatarUrl")
          .sort({ sentAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.chatMessageModel.countDocuments({ conversationId }),
      ]);

      // ✅ Handle case: no messages found
      if (!messages || messages.length === 0) {
        return {
          messages: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }

      // ✅ Return paginated messages in chronological order
      return {
        messages: messages.reverse(),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      // ✅ Log the error (use a logger if available)
      console.error("❌ Error fetching messages:", error);

      // ✅ Re-throw known NestJS exceptions directly
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      // ✅ Wrap unknown errors in a generic InternalServerErrorException
      throw new InternalServerErrorException(
        error.message || "An unexpected error occurred while fetching messages",
      );
    }
  }

  // async createMessage(data: {
  //   conversationId: string;
  //   fromUserId: string;
  //   message?: string;
  //   type?: MessageType;
  //   attachments?: any[];
  //   clientMessageId?: string;
  // }): Promise<ChatMessageDocument> {
  //   const { conversationId, fromUserId, message, type = MessageType.TEXT, attachments, clientMessageId } = data;

  //   // Verify user has access to conversation
  //   const hasAccess = await this.verifyConversationAccess(conversationId, fromUserId);
  //   if (!hasAccess) {
  //     throw new ForbiddenException('Access denied to conversation');
  //   }

  //   // Get conversation to determine toUserId
  //   const conversation = await this.conversationModel.findById(conversationId);
  //   if (!conversation) {
  //     throw new NotFoundException('Conversation not found');
  //   }

  //   const toUserId = conversation.customerId.toString() === fromUserId
  //     ? conversation.barberId
  //     : conversation.customerId;

  //   // Create message
  //   const chatMessage = new this.chatMessageModel({
  //     conversationId,
  //     fromUserId,
  //     toUserId,
  //     type,
  //     message,
  //     attachments,
  //     status: MessageStatus.SENT,
  //     sentAt: new Date(),
  //     clientMessageId,
  //   });

  //   await chatMessage.save();

  //   // Update conversation last message
  //   await this.conversationModel.findByIdAndUpdate(conversationId, {
  //     lastMessage: message,
  //     lastMessageAt: new Date(),
  //     lastMessageBy: fromUserId,
  //   });

  //   // Update unread count for recipient
  //   const recipientField = conversation.customerId.toString() === fromUserId ? 'barber' : 'customer';
  //   await this.conversationModel.findByIdAndUpdate(conversationId, {
  //     $inc: { [`readStatus.${recipientField}.unreadCount`]: 1 },
  //   });

  //   return chatMessage.populate('fromUserId', 'name avatarUrl');
  // }

  async createMessage(data: {
    conversationId: string;
    fromUserId: string;
    message?: string;
    type?: MessageType;
    attachments?: any[];
    clientMessageId?: string;
  }): Promise<ChatMessageDocument> {
    const session = await this.chatMessageModel.startSession();
    session.startTransaction();

    console.log(1);

    try {
      const {
        conversationId,
        fromUserId,
        message,
        type = MessageType.TEXT,
        attachments,
        clientMessageId,
      } = data;

      // ✅ Validate required fields
      if (!conversationId) {
        throw new BadRequestException("Conversation ID is required");
      }
      if (!fromUserId) {
        throw new BadRequestException(
          "Sender user ID (fromUserId) is required",
        );
      }
      console.log(2);

      // ✅ Verify user has access
      const hasAccess = await this.verifyConversationAccess(
        conversationId,
        fromUserId,
      );
      if (!hasAccess) {
        throw new ForbiddenException("Access denied to conversation");
      }
      console.log(3);

      // ✅ Find the conversation
      const conversation = await this.conversationModel
        .findById(conversationId)
        .session(session);
      if (!conversation) {
        throw new NotFoundException("Conversation not found");
      }
      console.log(4);

      const toUserId =
        conversation.customerId.toString() === fromUserId
          ? conversation.barberId
          : conversation.customerId;
      console.log(5);
      // ✅ Normalize and validate attachments
      const normalizedAttachments =
        attachments?.map((att, index) => {
          if (!att.fileUrl && !att.url) {
            throw new BadRequestException(
              `Attachment at index ${index} is missing a valid 'url' or 'fileUrl'`,
            );
          }

          return {
            url: att.fileUrl || att.url,
            filename: att.fileName || att.filename || "Unnamed File",
            mimeType:
              att.fileType || att.mimeType || "application/octet-stream",
            size: att.size || 0,
            thumbnailUrl: att.thumbnailUrl || null,
          };
        }) ?? [];

      console.log(6);

      // ✅ Create message document
      const chatMessage = new this.chatMessageModel({
        conversationId,
        fromUserId,
        toUserId,
        type,
        message,
        attachments: normalizedAttachments,
        status: MessageStatus.SENT,
        sentAt: new Date(),
        clientMessageId,
      });
      console.log(7);
      await chatMessage.save({ session });
      console.log(71);
      // Update conversation metadata
      const recipientField =
        conversation.customerId.toString() === fromUserId
          ? "barber"
          : "customer";
      console.log(8);
      // ✅ Update conversation metadata safely
      await this.conversationModel.findByIdAndUpdate(
        conversationId,
        {
          lastMessage:
            message ||
            (normalizedAttachments.length > 0 ? "📎 Attachment" : ""),
          lastMessageAt: new Date(),
          lastMessageBy: fromUserId,
          $inc: { [`readStatus.${recipientField}.unreadCount`]: 1 },
        },
        { session },
      );
      console.log(9);
      // ✅ Commit the transaction
      await session.commitTransaction();
      session.endSession();

      // ✅ Populate sender info
      const populatedMessage = await chatMessage.populate(
        "fromUserId",
        "name avatarUrl",
      );
      console.log(10);
      // ✅ Emit via WebSocket AFTER successful commit
      this.chatGateway.sendToConversation(
        conversationId,
        "new_message",
        populatedMessage,
      );
      console.log(11);
      this.chatGateway.sendToConversation(
        conversationId,
        "conversation_updated",
        {
          conversationId,
          lastMessage: message,
          lastMessageAt: chatMessage.sentAt,
        },
      );
      console.log(12);

      return populatedMessage;
    } catch (error) {
      // ✅ Abort the transaction if any error occurs
      await session.abortTransaction();
      session.endSession();

      console.error("❌ Error creating message:", error);

      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        error.message || "An unexpected error occurred while creating message",
      );
    }
  }

  async markMessageAsRead(
    conversationId: string,
    messageId: string,
    userId: string,
  ): Promise<void> {
    const message = await this.chatMessageModel.findOne({
      _id: messageId,
      conversationId,
      toUserId: userId,
    });

    if (!message) {
      throw new NotFoundException("Message not found");
    }

    if (message.readAt) {
      return; // Already read
    }

    message.readAt = new Date();
    message.status = MessageStatus.READ;
    await message.save();
  }

  async markMessagesAsRead(
    conversationId: string,
    userId: string,
  ): Promise<void> {
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

    const userField =
      conversation.customerId.toString() === userId ? "customer" : "barber";
    await this.conversationModel.findByIdAndUpdate(conversationId, {
      $set: {
        [`readStatus.${userField}.unreadCount`]: 0,
        [`readStatus.${userField}.lastReadAt`]: new Date(),
      },
    });
  }

  async verifyConversationAccess(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
      $or: [{ customerId: userId }, { barberId: userId }],
    });

    return !!conversation;
  }

  async archiveConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
      $or: [{ customerId: userId }, { barberId: userId }],
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    conversation.isArchived = true;
    conversation.archivedAt = new Date();
    conversation.archivedBy = new Types.ObjectId(userId);
    await conversation.save();
  }

  async unarchiveConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
      $or: [{ customerId: userId }, { barberId: userId }],
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
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
      const userField =
        conversation.customerId.toString() === userId ? "customer" : "barber";
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
      const userConversations = await this.conversationModel
        .find({
          $or: [{ customerId: userId }, { barberId: userId }],
          isActive: true,
        })
        .select("_id");

      searchFilter.conversationId = {
        $in: userConversations.map((c) => c._id),
      };
    }

    const [messages, total] = await Promise.all([
      this.chatMessageModel
        .find(searchFilter)
        .populate("fromUserId", "name avatarUrl")
        .populate("conversationId")
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
