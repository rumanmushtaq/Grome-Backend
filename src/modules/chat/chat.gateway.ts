import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessageType } from '../../schemas/chat-message.schema';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { NotificationsService } from '../notifications/notifications.service';

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
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
    private notificationsService: NotificationsService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Chat Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.emit('unauthorized', { message: 'Token missing' });
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      client.user = {
        userId: payload.sub,
        role: payload.role,
        email: payload.email,
        phone: payload.phone,
      };

      // Support multiple devices
      if (!this.connectedUsers.has(payload.sub)) {
        this.connectedUsers.set(payload.sub, new Set());
      }
      this.connectedUsers.get(payload.sub).add(client.id);

      await client.join(`user_${payload.sub}`);
      await client.join(`role_${payload.role}`);

      this.logger.log(`User ${payload.sub} connected (socket: ${client.id})`);

      this.sendToRole('barber', 'user_online', { userId: payload.sub });

    } catch (error) {
      this.logger.error('Authentication failed:', error);
      client.emit('unauthorized', { message: 'Invalid token' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      const sockets = this.connectedUsers.get(client.user.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.connectedUsers.delete(client.user.userId);
      }

      this.logger.log(`User ${client.user.userId} disconnected (socket: ${client.id})`);
      this.sendToRole('barber', 'user_offline', { userId: client.user.userId });
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) return;

    const { conversationId } = data;
    const hasAccess = await this.chatService.verifyConversationAccess(conversationId, client.user.userId);

    if (!hasAccess) {
      client.emit('error', { message: 'Access denied to conversation' });
      return;
    }

    await client.join(`conversation_${conversationId}`);
    await this.chatService.markMessagesAsRead(conversationId, client.user.userId);
    client.emit('joined_conversation', { conversationId });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      conversationId: string;
      message: string;
      type?: string;
      attachments?: any[];
    },
  ) {
    if (!client.user) return;

    const { conversationId, message, type = 'text', attachments } = data;

    try {
      // ✅ Use transaction in createMessage
      const newMessage = await this.chatService.createMessage({
        conversationId,
        fromUserId: client.user.userId,
        message,
        type: type as MessageType,
        attachments,
        clientMessageId: `${Date.now()}_${Math.random()}`,
      });

      // Emit message & conversation updates
      this.sendToConversation(conversationId, 'new_message', newMessage);
      this.sendToConversation(conversationId, 'conversation_updated', {
        conversationId,
        lastMessage: message,
        lastMessageAt: newMessage.sentAt,
      });

      // Push notification
      await this.notificationsService.sendMessageNotification(newMessage);

    } catch (error) {
      this.logger.error('Error sending message:', error);
      client.emit('message_error', { error: 'Failed to send message', conversationId });
    }
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
}
