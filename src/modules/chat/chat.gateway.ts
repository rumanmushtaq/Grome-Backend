import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { UseGuards, Logger, Inject, forwardRef } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { MessageType } from "../../schemas/chat-message.schema";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ChatService } from "./chat.service";
import { NotificationsService } from "../notifications/notifications.service";

interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    role: string;
    email?: string;
    phone?: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
    credentials: true,
  },
  namespace: "/chat",
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>
  private typingUsers = new Map<string, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
    private notificationsService: NotificationsService,
  ) {}

  afterInit(server: Server) {
    this.logger.log("Chat Gateway initialized");
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        client.emit("unauthorized", { message: "Token missing" });
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>("jwt.secret"),
      });

      client.user = {
        userId: payload.sub,
        role: payload.role,
        email: payload.email,
        phone: payload.phone,
      };

      const userId = payload.sub;
      // Support multiple devices
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      const sockets = this.connectedUsers.get(userId);
      const wasOffline = sockets.size === 0;

      sockets.add(client.id);
      this.connectedUsers.get(userId).add(client.id);

      await client.join(`user_${userId}`);
      await client.join(`role_${payload.role}`);

      if (wasOffline) {
        this.server.emit("user_online", { userId });
      }

      client.emit("online_users", {
        users: this.getOnlineUsers(),
      });

      this.logger.log(`User ${payload.sub} connected (socket: ${client.id})`);

      this.sendToRole("barber", "user_online", { userId: payload.sub });
    } catch (error) {
      this.logger.error("Authentication failed:", error);
      client.emit("unauthorized", { message: "Invalid token" });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (!client.user) return;
    const userId = client.user.userId;

    // 🔹 1️⃣ CLEAR TYPING STATE (IMPORTANT)
    for (const [conversationId, users] of this.typingUsers.entries()) {
      if (users.has(userId)) {
        users.delete(userId);

        // notify other users in conversation
        this.server
          .to(`conversation_${conversationId}`)
          .emit("user_stop_typing", {
            conversationId,
            userId,
          });

        if (users.size === 0) {
          this.typingUsers.delete(conversationId);
        }
      }
    }
    // 🔹 2️⃣ EXISTING ONLINE/OFFLINE LOGIC
    const sockets = this.connectedUsers.get(userId);
    if (!sockets) return;
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.connectedUsers.delete(userId);
        await this.chatService.updateLastSeen(userId);

        this.server.emit("user_offline", {
          userId,
          lastSeen: new Date(),
        });
      }
    }

    this.logger.log(
      `User ${client.user.userId} disconnected (socket: ${client.id})`,
    );
    this.sendToRole("barber", "user_offline", { userId: client.user.userId });
  }

  @SubscribeMessage("join_conversation")
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) return;

    const { conversationId } = data;
    const hasAccess = await this.chatService.verifyConversationAccess(
      conversationId,
      client.user.userId,
    );

    if (!hasAccess) {
      client.emit("error", { message: "Access denied to conversation" });
      return;
    }

    await client.join(`conversation_${conversationId}`);
    await this.chatService.markMessagesAsRead(
      conversationId,
      client.user.userId,
    );
    client.emit("joined_conversation", { conversationId });
  }

  @SubscribeMessage("send_message")
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      conversationId: string;
      message: string;
      type?: string;
      attachments?: any[];
    },
  ) {
    if (!client.user) return;

    const { conversationId, message, type = "text", attachments } = data;

    try {
      // ✅ Use transaction in createMessage
      const newMessage = await this.chatService.createMessage({
        conversationId,
        user: client.user,
        message,
        type: type as MessageType,
        attachments,
        clientMessageId: `${Date.now()}_${Math.random()}`,
      });

      // Emit message & conversation updates
      this.sendToConversation(conversationId, "new_message", newMessage);
      this.sendToConversation(conversationId, "conversation_updated", {
        conversationId,
        lastMessage: message,
        lastMessageAt: newMessage.sentAt,
      });

      // Push notification
      await this.notificationsService.sendMessageNotification(newMessage);
    } catch (error) {
      this.logger.error("Error sending message:", error);
      client.emit("message_error", {
        error: "Failed to send message",
        conversationId,
      });
    }
  }

  @SubscribeMessage("typing_start")
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) return;

    const { conversationId } = data;

    // 1️⃣ Verify access
    const access = await this.chatService.verifyConversationAccess(
      conversationId,
      client.user,
    );

    if (!access.allowed) return;

    // 2️⃣ Track typing state
    if (!this.typingUsers.has(conversationId)) {
      this.typingUsers.set(conversationId, new Set());
    }

    const typingSet = this.typingUsers.get(conversationId);
    if (typingSet.has(client.user.userId)) return; // prevent spam

    typingSet.add(client.user.userId);

    // 3️⃣ Notify others
    client.to(`conversation_${conversationId}`).emit("user_typing", {
      conversationId,
      userId: client.user.userId,
    });
  }

  @SubscribeMessage("typing_stop")
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) return;

    const { conversationId } = data;

    const typingSet = this.typingUsers.get(conversationId);
    if (!typingSet) return;

    if (!typingSet.has(client.user.userId)) return;

    typingSet.delete(client.user.userId);

    if (typingSet.size === 0) {
      this.typingUsers.delete(conversationId);
    }

    client.to(`conversation_${conversationId}`).emit("user_stop_typing", {
      conversationId,
      userId: client.user.userId,
    });
  }

  // Other events (typing, leave_conversation, mark_read, booking, location) remain mostly unchanged

  async sendToUser(userId: string, event: string, data: any) {
    const sockets = this.connectedUsers.get(userId);
    if (sockets) {
      sockets.forEach((socketId) => this.server.to(socketId).emit(event, data));
    }
  }

  async sendToConversation(conversationId: string, event: string, data: any) {
    this.server.to(`conversation_${conversationId}`).emit(event, data);
  }

  async sendToRole(role: string, event: string, data: any) {
    this.server.to(`role_${role}`).emit(event, data);
  }

  private isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  private getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }
}
