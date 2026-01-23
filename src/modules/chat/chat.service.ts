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
import {
  AccessDenied,
  IdRequired,
  NotFound,
  PAGELIMITPOSITIVE,
} from "@/constants/messages.constants";
import { Barber, BarberDocument } from "@/schemas/barber.schema";

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
    @InjectModel(Barber.name) private barberModel: Model<BarberDocument>,
  ) {}

  async createConversation(
    customerId: string,
    barberId: string,
    bookingId?: string,
  ) {
    const customerObjId = new Types.ObjectId(customerId);
    const barberObjId = new Types.ObjectId(barberId);
    const bookingObjId = bookingId ? new Types.ObjectId(bookingId) : null;

    const match: any = {
      customerId: customerObjId,
      barberId: barberObjId,
      isActive: true,
    };

    if (bookingObjId) {
      match.bookingId = bookingObjId;
    }

    // 1️⃣ Check existing
    const existing = await this.conversationModel.aggregate(
      this.buildConversationListPipeline(match, customerObjId),
    );

    if (existing.length > 0) {
      console.log("existing", existing);
      return existing[0];
    }

    // 2️⃣ Create
    const conversation = await this.conversationModel.create({
      customerId: customerObjId,
      barberId: barberObjId,
      bookingId: bookingObjId,
      type: ConversationType.BOOKING,
      isActive: true,
      lastMessageAt: new Date(),
      readStatus: {
        customer: { unreadCount: 0, lastReadAt: new Date() },
        barber: { unreadCount: 0, lastReadAt: new Date() },
      },
    });

    // 3️⃣ Fetch created
    const created = await this.conversationModel.aggregate(
      this.buildConversationListPipeline(
        { _id: conversation._id },
        customerObjId,
      ),
    );

    console.log("created", created);

    return created[0];
  }

async getConversations(
  userId: string,
  page = 1,
  limit = 20,
  userRole: 'customer' | 'barber',
): Promise<{
  conversations: ConversationDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const skip = (page - 1) * limit;

  // 1️⃣ Normalize identity (CRITICAL STEP)
  const resolvedId =
    userRole === 'customer'
      ? userId
      : await this.getBarberIdByUserId(userId);

  const resolvedObjectId = new Types.ObjectId(resolvedId);

  // 2️⃣ Build role-based match (NO $or)
  const matchCondition =
    userRole === 'customer'
      ? { customerId: resolvedObjectId }
      : { barberId: resolvedObjectId };

  // 3️⃣ Run aggregation + count in parallel
  const [conversations, total] = await Promise.all([
    this.conversationModel.aggregate([
      {
        $match: {
          isActive: true,
          ...matchCondition,
        },
      },

      // BARBER
      {
        $lookup: {
          from: 'barbers',
          localField: 'barberId',
          foreignField: '_id',
          as: 'barber',
        },
      },
      { $unwind: '$barber' },

      // CUSTOMER
      {
        $lookup: {
          from: 'users',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: '$customer' },

      // BARBER USER
      {
        $lookup: {
          from: 'users',
          localField: 'barber.userId',
          foreignField: '_id',
          as: 'barberUser',
        },
      },
      {
        $unwind: {
          path: '$barberUser',
          preserveNullAndEmptyArrays: true,
        },
      },

      // SORT + PAGINATION
      { $sort: { lastMessageAt: -1 } },
      { $skip: skip },
      { $limit: limit },

      // FINAL SHAPE
      {
        $project: {
          _id: 1,
          type: 1,
          bookingId: 1,
          lastMessage: 1,
          lastMessageAt: 1,
          readStatus: 1,

          customer: {
            _id: '$customer._id',
            name: '$customer.name',
            avatarUrl: '$customer.avatarUrl',
            phone: '$customer.phone',
          },

          barber: {
            _id: '$barber._id',
            shopName: '$barber.shopName',
            images: '$barber.images',
            rating: '$barber.rating',
          },

          barberUser: {
            _id: '$barberUser._id',
            name: '$barberUser.name',
            avatarUrl: '$barberUser.avatarUrl',
          },
        },
      },
    ]),

    // 4️⃣ Accurate count (same match condition)
    this.conversationModel.countDocuments({
      isActive: true,
      ...matchCondition,
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
  userRole: 'customer' | 'barber',
): Promise<ConversationDocument> {
  // 1️⃣ Validate conversationId
  if (!Types.ObjectId.isValid(conversationId)) {
    throw new BadRequestException('Invalid Conversation ID');
  }

  const conversationObjectId = new Types.ObjectId(conversationId);

  // 2️⃣ Resolve barberId if needed
  const resolvedUserId =
    userRole === 'customer' ? userId : await this.getBarberIdByUserId(userId);
  const resolvedObjectId = new Types.ObjectId(resolvedUserId);

  // 3️⃣ Role-based match condition
  const matchCondition =
    userRole === 'customer'
      ? { customerId: resolvedObjectId }
      : { barberId: resolvedObjectId };

  // 4️⃣ Aggregate pipeline
  const [conversation] = await this.conversationModel.aggregate([
    { $match: { _id: conversationObjectId, isActive: true, ...matchCondition } },

    // Join BARBER → BARBERS
    {
      $lookup: {
        from: 'barbers',
        localField: 'barberId',
        foreignField: '_id',
        as: 'barber',
      },
    },
    { $unwind: '$barber' },

    // Join CUSTOMER → USERS
    {
      $lookup: {
        from: 'users',
        localField: 'customerId',
        foreignField: '_id',
        as: 'customer',
      },
    },
    { $unwind: '$customer' },

    // Join BARBER.userId → USERS
    {
      $lookup: {
        from: 'users',
        localField: 'barber.userId',
        foreignField: '_id',
        as: 'barberUser',
      },
    },
    {
      $unwind: {
        path: '$barberUser',
        preserveNullAndEmptyArrays: true,
      },
    },

    // Project clean response
    {
      $project: {
        _id: 1,
        type: 1,
        bookingId: 1,
        lastMessage: 1,
        lastMessageAt: 1,
        readStatus: 1,

        customer: {
          _id: '$customer._id',
          name: '$customer.name',
          avatarUrl: '$customer.avatarUrl',
          phone: '$customer.phone',
        },

        barber: {
          _id: '$barber._id',
          shopName: '$barber.shopName',
          images: '$barber.images',
          rating: '$barber.rating',
        },

        barberUser: {
          _id: '$barberUser._id',
          name: '$barberUser.name',
          avatarUrl: '$barberUser.avatarUrl',
        },
      },
    },
  ]);

  if (!conversation) {
    throw new NotFoundException('Conversation not found');
  }

  return conversation;
}


async getMessages(
  conversationId: string,
  userId: string,
  userRole: 'customer' | 'barber',
  page: number = 1,
  limit: number = 50,
): Promise<{
  messages: ChatMessageDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  // 1️⃣ Validate inputs
  if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
    throw new BadRequestException(IdRequired('Conversation'));
  }

  if (!userId || !Types.ObjectId.isValid(userId)) {
    throw new BadRequestException(IdRequired('User'));
  }

  if (page < 1 || limit < 1) {
    throw new BadRequestException(PAGELIMITPOSITIVE);
  }

  const conversationObjectId = new Types.ObjectId(conversationId);

  // 2️⃣ Resolve barberId if needed
  let resolvedUserId = userId;
  if (userRole === 'barber') {
    resolvedUserId = await this.getBarberIdByUserId(userId);
  }
  const resolvedObjectId = new Types.ObjectId(resolvedUserId);

  // 3️⃣ Verify access
  const hasAccess = await this.conversationModel.exists({
    _id: conversationObjectId,
    isActive: true,
    ...(userRole === 'customer'
      ? { customerId: resolvedObjectId }
      : { barberId: resolvedObjectId }),
  });

  if (!hasAccess) {
    throw new ForbiddenException(AccessDenied('conversation'));
  }

  const skip = (page - 1) * limit;

  // 4️⃣ Fetch messages
  const [messages, total] = await Promise.all([
    this.chatMessageModel.aggregate([
      { $match: { conversationId: conversationObjectId } },
      { $sort: { sentAt: -1 } }, // latest first
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'fromUserId',
          foreignField: '_id',
          as: 'fromUser',
        },
      },
      { $unwind: '$fromUser' },
      {
        $project: {
          _id: 1,
          conversationId: 1,
          message: 1,
          messageType: 1,
          attachments: 1,
          sentAt: 1,
          status: 1,
          fromUser: {
            _id: '$fromUser._id',
            name: '$fromUser.name',
            avatarUrl: '$fromUser.avatarUrl',
          },
        },
      },
    ]),
    this.chatMessageModel.countDocuments({ conversationId: conversationObjectId }),
  ]);

  return {
    messages: messages.reverse(), // chronological order
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
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
  }): Promise<any> {
    const session = await this.chatMessageModel.startSession();

    try {
      session.startTransaction();

      const {
        conversationId,
        fromUserId,
        message,
        type = MessageType.TEXT,
        attachments = [],
        clientMessageId,
      } = data;

      // ✅ Validate ObjectIds
      if (!Types.ObjectId.isValid(conversationId)) {
        throw new BadRequestException("Invalid Conversation ID");
      }

      if (!Types.ObjectId.isValid(fromUserId)) {
        throw new BadRequestException("Invalid Sender User ID");
      }

      const conversationObjectId = new Types.ObjectId(conversationId);
      const fromUserObjectId = new Types.ObjectId(fromUserId);

      // ✅ Verify access
      const hasAccess = await this.verifyConversationAccess(
        conversationId,
        fromUserId,
      );

      if (!hasAccess) {
        throw new ForbiddenException("Access denied to conversation");
      }

      // ✅ Fetch conversation inside transaction
      const conversation = await this.conversationModel
        .findOne(
          { _id: conversationObjectId, isActive: true },
          { customerId: 1, barberId: 1 },
        )
        .session(session);

      if (!conversation) {
        throw new NotFoundException("Conversation not found");
      }

      // ✅ Resolve recipient
      const isCustomer =
        conversation.customerId.toString() === fromUserObjectId.toString();

      const toUserObjectId = isCustomer
        ? conversation.barberId
        : conversation.customerId;

      // ✅ Normalize attachments
      const normalizedAttachments = attachments.map((att, index) => {
        if (!att.url && !att.fileUrl) {
          throw new BadRequestException(
            `Attachment at index ${index} is missing a valid url`,
          );
        }

        return {
          url: att.url || att.fileUrl,
          filename: att.filename || att.fileName || "Unnamed file",
          mimeType: att.mimeType || att.fileType || "application/octet-stream",
          size: att.size || 0,
          thumbnailUrl: att.thumbnailUrl || null,
        };
      });

      // ✅ Create message
      const chatMessage = await this.chatMessageModel.create(
        [
          {
            conversationId: conversationObjectId,
            fromUserId: fromUserObjectId,
            toUserId: toUserObjectId,
            type,
            message,
            attachments: normalizedAttachments,
            status: MessageStatus.SENT,
            sentAt: new Date(),
            clientMessageId,
          },
        ],
        { session },
      );

      // ✅ Update conversation metadata
      const recipientField = isCustomer ? "barber" : "customer";

      await this.conversationModel.updateOne(
        { _id: conversationObjectId },
        {
          lastMessage:
            message || (normalizedAttachments.length ? "📎 Attachment" : ""),
          lastMessageAt: new Date(),
          lastMessageBy: fromUserObjectId,
          $inc: {
            [`readStatus.${recipientField}.unreadCount`]: 1,
          },
        },
        { session },
      );

      // ✅ Commit
      await session.commitTransaction();
      session.endSession();

      // ✅ Re-fetch populated message (SAFE)
      const populatedMessage = await this.chatMessageModel.aggregate([
        { $match: { _id: chatMessage[0]._id } },
        {
          $lookup: {
            from: "users",
            localField: "fromUserId",
            foreignField: "_id",
            as: "fromUser",
          },
        },
        { $unwind: "$fromUser" },
        {
          $project: {
            _id: 1,
            conversationId: 1,
            message: 1,
            type: 1,
            attachments: 1,
            sentAt: 1,
            status: 1,
            fromUser: {
              _id: "$fromUser._id",
              name: "$fromUser.name",
              avatarUrl: "$fromUser.avatarUrl",
            },
          },
        },
      ]);

      // ✅ Emit socket events AFTER commit
      this.chatGateway.sendToConversation(
        conversationId,
        "new_message",
        populatedMessage[0],
      );

      this.chatGateway.sendToConversation(
        conversationId,
        "conversation_updated",
        {
          conversationId,
          lastMessage:
            message || (normalizedAttachments.length ? "📎 Attachment" : ""),
          lastMessageAt: populatedMessage[0].sentAt,
        },
      );

      return populatedMessage[0];
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        error.message || "Failed to create message",
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
    // ✅ Validate ObjectIds
    if (
      !Types.ObjectId.isValid(conversationId) ||
      !Types.ObjectId.isValid(userId)
    ) {
      return;
    }

    const conversationObjectId = new Types.ObjectId(conversationId);
    const userObjectId = new Types.ObjectId(userId);

    // ✅ Verify access
    const hasAccess = await this.verifyConversationAccess(
      conversationId,
      userId,
    );

    if (!hasAccess) {
      throw new ForbiddenException(AccessDenied("conversation"));
    }

    // ✅ Fetch conversation (minimal fields)
    const conversation = await this.conversationModel.findOne(
      { _id: conversationObjectId, isActive: true },
      { customerId: 1, barberId: 1 },
    );

    if (!conversation) return;

    // ✅ Determine user role
    const isCustomer =
      conversation.customerId.toString() === userObjectId.toString();

    const userField = isCustomer ? "customer" : "barber";

    // ✅ Mark messages as read (idempotent)
    await this.chatMessageModel.updateMany(
      {
        conversationId: conversationObjectId,
        toUserId: userObjectId,
        readAt: { $exists: false },
      },
      {
        $set: {
          readAt: new Date(),
          status: MessageStatus.READ,
        },
      },
    );

    // ✅ Reset unread count
    await this.conversationModel.updateOne(
      { _id: conversationObjectId },
      {
        $set: {
          [`readStatus.${userField}.unreadCount`]: 0,
          [`readStatus.${userField}.lastReadAt`]: new Date(),
        },
      },
    );
  }

  async verifyConversationAccess(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    if (
      !Types.ObjectId.isValid(conversationId) ||
      !Types.ObjectId.isValid(userId)
    ) {
      return false;
    }

    const conversationObjectId = new Types.ObjectId(conversationId);
    const userObjectId = new Types.ObjectId(userId);

    const exists = await this.conversationModel.exists({
      _id: conversationObjectId,
      isActive: true,
      $or: [{ customerId: userObjectId }, { barberId: userObjectId }],
    });

    return !!exists;
  }

  async archiveConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    if (
      !Types.ObjectId.isValid(conversationId) ||
      !Types.ObjectId.isValid(userId)
    ) {
      throw new BadRequestException("Invalid IDs");
    }

    const conversationObjectId = new Types.ObjectId(conversationId);
    const userObjectId = new Types.ObjectId(userId);

    const hasAccess = await this.verifyConversationAccess(
      conversationId,
      userId,
    );

    if (!hasAccess) {
      throw new ForbiddenException("Access denied to conversation");
    }

    const result = await this.conversationModel.updateOne(
      { _id: conversationObjectId, isActive: true },
      {
        $set: {
          isArchived: true,
          archivedAt: new Date(),
          archivedBy: userObjectId,
        },
      },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException("Conversation not found");
    }
  }

  async unarchiveConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    if (
      !Types.ObjectId.isValid(conversationId) ||
      !Types.ObjectId.isValid(userId)
    ) {
      throw new BadRequestException("Invalid IDs");
    }

    const conversationObjectId = new Types.ObjectId(conversationId);

    const hasAccess = await this.verifyConversationAccess(
      conversationId,
      userId,
    );

    if (!hasAccess) {
      throw new ForbiddenException("Access denied to conversation");
    }

    const result = await this.conversationModel.updateOne(
      { _id: conversationObjectId, isActive: true },
      {
        $unset: {
          archivedAt: 1,
          archivedBy: 1,
        },
        $set: {
          isArchived: false,
        },
      },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException("Conversation not found");
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    if (!Types.ObjectId.isValid(userId)) {
      return 0;
    }

    const userObjectId = new Types.ObjectId(userId);

    const result = await this.conversationModel.aggregate([
      {
        $match: {
          isActive: true,
          isArchived: { $ne: true },
          $or: [{ customerId: userObjectId }, { barberId: userObjectId }],
        },
      },
      {
        $project: {
          unreadCount: {
            $cond: [
              { $eq: ["$customerId", userObjectId] },
              "$readStatus.customer.unreadCount",
              "$readStatus.barber.unreadCount",
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalUnread: { $sum: "$unreadCount" },
        },
      },
    ]);

    return result.length ? result[0].totalUnread : 0;
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
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("Invalid User ID");
    }

    const userObjectId = new Types.ObjectId(userId);
    const skip = (page - 1) * limit;

    // ✅ Build aggregation pipeline
    const pipeline: any[] = [];

    // 1️⃣ Match conversations (by conversationId or all user conversations)
    if (conversationId) {
      if (!Types.ObjectId.isValid(conversationId)) {
        throw new BadRequestException("Invalid Conversation ID");
      }
      const conversationObjectId = new Types.ObjectId(conversationId);

      // Optional: verify user has access
      const hasAccess = await this.verifyConversationAccess(
        conversationId,
        userId,
      );
      if (!hasAccess) {
        throw new ForbiddenException("Access denied to conversation");
      }

      pipeline.push({
        $match: {
          conversationId: conversationObjectId,
          $text: { $search: query },
        },
      });
    } else {
      // Match all active conversations of this user
      pipeline.push({
        $lookup: {
          from: "conversations",
          localField: "conversationId",
          foreignField: "_id",
          as: "conversation",
        },
      });
      pipeline.push({ $unwind: "$conversation" });

      pipeline.push({
        $match: {
          $or: [
            { "conversation.customerId": userObjectId },
            { "conversation.barberId": userObjectId },
          ],
          "conversation.isActive": true,
          $text: { $search: query },
        },
      });
    }

    // 2️⃣ Sort by latest
    pipeline.push({ $sort: { sentAt: -1 } });

    // 3️⃣ Count total messages
    const countPipeline = [...pipeline, { $count: "total" }];
    const totalResult = await this.chatMessageModel.aggregate(countPipeline);
    const total = totalResult.length ? totalResult[0].total : 0;

    // 4️⃣ Pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // 5️⃣ Populate sender info
    pipeline.push({
      $lookup: {
        from: "users",
        localField: "fromUserId",
        foreignField: "_id",
        as: "fromUser",
      },
    });
    pipeline.push({ $unwind: "$fromUser" });

    // 6️⃣ Project clean fields
    pipeline.push({
      $project: {
        _id: 1,
        conversationId: 1,
        message: 1,
        messageType: 1,
        attachments: 1,
        sentAt: 1,
        status: 1,
        fromUser: {
          _id: "$fromUser._id",
          name: "$fromUser.name",
          avatarUrl: "$fromUser.avatarUrl",
        },
      },
    });

    const messages = await this.chatMessageModel.aggregate(pipeline);

    return {
      messages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async getBarberIdByUserId(userId: string): Promise<string> {
    const userObjectId = new Types.ObjectId(userId)
    const barber = await this.barberModel
      .findOne({ userId : userObjectId })
      .select("_id")
      .exec();

    if (!barber) {
      throw new NotFoundException("Barber not found");
    }

    return barber._id.toString();
  }

  private buildConversationListPipeline(
    match: any,
    userObjectId: Types.ObjectId,
  ): any[] {
    return [
      { $match: match },

      /* SORT (chat list order) */
      { $sort: { lastMessageAt: -1 } },

      /* BARBER */
      {
        $lookup: {
          from: "barbers",
          localField: "barberId",
          foreignField: "_id",
          as: "barber",
        },
      },
      { $unwind: "$barber" },

      /* CUSTOMER */
      {
        $lookup: {
          from: "users",
          localField: "customerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },
      {
        $lookup: {
          from: "bookings",
          localField: "bookingId",
          foreignField: "_id",
          as: "booking",
        },
      },
      { $unwind: "$booking" },

      /* BARBER USER */
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

      /* COMPUTED FIELDS */
      {
        $addFields: {
          unreadCount: {
            $cond: [
              { $eq: ["$customerId", userObjectId] },
              "$readStatus.customer.unreadCount",
              "$readStatus.barber.unreadCount",
            ],
          },

          otherUser: {
            $cond: [
              { $eq: ["$customerId", userObjectId] },
              {
                _id: "$barberUser._id",
                name: "$barberUser.name",
                avatarUrl: "$barberUser.avatarUrl",
              },
              {
                _id: "$customer._id",
                name: "$customer.name",
                avatarUrl: "$customer.avatarUrl",
              },
            ],
          },
        },
      },

      /* FINAL SHAPE */
      {
        $project: {
          _id: 1,
          type: 1,
          bookingId: 1,
          lastMessageAt: 1,
          unreadCount: 1,
          otherUser: 1,

          customer: {
            _id: "$customer._id",
            name: "$customer.name",
            avatarUrl: "$customer.avatarUrl",
          },
          booking: 1,

          barberUser: {
            _id: "$barberUser._id",
            name: "$barberUser.name",
            avatarUrl: "$barberUser.avatarUrl",
          },

          barber: {
            _id: 1,
            shopName: 1,
            images: 1,
            rating: 1,
          },
        },
      },
    ];
  }
}
