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
import { UseGuards, Logger } from '@nestjs/common';
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
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private chatService: ChatService,
    private notificationsService: NotificationsService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Chat Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Authenticate user from JWT token
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      // Store user info in socket
      client.user = {
        userId: payload.sub,
        role: payload.role,
        email: payload.email,
        phone: payload.phone,
      };

      // Store connection
      this.connectedUsers.set(payload.sub, client.id);
      
      // Join user to their personal room
      await client.join(`user_${payload.sub}`);
      
      // Join role-based rooms
      await client.join(`role_${payload.role}`);

      this.logger.log(`User ${payload.sub} connected with socket ${client.id}`);
      
      // Notify user is online
      this.server.to(`role_barber`).emit('user_online', {
        userId: payload.sub,
        socketId: client.id,
      });

    } catch (error) {
      this.logger.error('Authentication failed:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      this.connectedUsers.delete(client.user.userId);
      
      this.logger.log(`User ${client.user.userId} disconnected`);
      
      // Notify user is offline
      this.server.to(`role_barber`).emit('user_offline', {
        userId: client.user.userId,
        socketId: client.id,
      });
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) return;

    const { conversationId } = data;
    
    // Verify user has access to this conversation
    const hasAccess = await this.chatService.verifyConversationAccess(
      conversationId,
      client.user.userId,
    );

    if (!hasAccess) {
      client.emit('error', { message: 'Access denied to conversation' });
      return;
    }

    // Join conversation room
    await client.join(`conversation_${conversationId}`);
    
    // Mark messages as read
    await this.chatService.markMessagesAsRead(conversationId, client.user.userId);

    client.emit('joined_conversation', { conversationId });
    this.logger.log(`User ${client.user.userId} joined conversation ${conversationId}`);
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) return;

    const { conversationId } = data;
    await client.leave(`conversation_${conversationId}`);
    
    client.emit('left_conversation', { conversationId });
    this.logger.log(`User ${client.user.userId} left conversation ${conversationId}`);
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
      // Create message
      const newMessage = await this.chatService.createMessage({
        conversationId,
        fromUserId: client.user.userId,
        message,
        type: type as MessageType,
        attachments,
        clientMessageId: `${Date.now()}_${Math.random()}`,
      });

      // Emit to conversation room
      this.server.to(`conversation_${conversationId}`).emit('new_message', newMessage);

      // Update conversation last message
      this.server.to(`conversation_${conversationId}`).emit('conversation_updated', {
        conversationId,
        lastMessage: message,
        lastMessageAt: newMessage.sentAt,
      });

      // Send push notification to offline users
      await this.notificationsService.sendMessageNotification(newMessage);

      this.logger.log(`Message sent in conversation ${conversationId} by user ${client.user.userId}`);

    } catch (error) {
      this.logger.error('Error sending message:', error);
      client.emit('message_error', { 
        error: 'Failed to send message',
        conversationId,
      });
    }
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) return;

    const { conversationId } = data;
    
    // Emit to other users in conversation
    client.to(`conversation_${conversationId}`).emit('user_typing', {
      userId: client.user.userId,
      conversationId,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) return;

    const { conversationId } = data;
    
    // Emit to other users in conversation
    client.to(`conversation_${conversationId}`).emit('user_typing', {
      userId: client.user.userId,
      conversationId,
      isTyping: false,
    });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageId: string },
  ) {
    if (!client.user) return;

    const { conversationId, messageId } = data;

    try {
      await this.chatService.markMessageAsRead(conversationId, messageId, client.user.userId);
      
      // Emit read receipt to conversation
      this.server.to(`conversation_${conversationId}`).emit('message_read', {
        messageId,
        userId: client.user.userId,
        readAt: new Date(),
      });

    } catch (error) {
      this.logger.error('Error marking message as read:', error);
    }
  }

  // Booking-related real-time events
  @SubscribeMessage('booking_status_update')
  async handleBookingStatusUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { bookingId: string; status: string; eta?: Date },
  ) {
    if (!client.user) return;

    const { bookingId, status, eta } = data;

    // Emit to both customer and barber
    this.server.emit('booking_updated', {
      bookingId,
      status,
      eta,
      updatedBy: client.user.userId,
      updatedAt: new Date(),
    });

    this.logger.log(`Booking ${bookingId} status updated to ${status} by user ${client.user.userId}`);
  }

  @SubscribeMessage('location_update')
  async handleLocationUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { 
      bookingId: string; 
      latitude: number; 
      longitude: number; 
      address?: string;
    },
  ) {
    if (!client.user) return;

    const { bookingId, latitude, longitude, address } = data;

    // Emit location update to relevant users
    this.server.emit('barber_location_update', {
      bookingId,
      barberId: client.user.userId,
      location: { latitude, longitude, address },
      timestamp: new Date(),
    });

    this.logger.log(`Location updated for booking ${bookingId} by barber ${client.user.userId}`);
  }

  // Utility methods
  async sendToUser(userId: string, event: string, data: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  async sendToConversation(conversationId: string, event: string, data: any) {
    this.server.to(`conversation_${conversationId}`).emit(event, data);
  }

  async sendToRole(role: string, event: string, data: any) {
    this.server.to(`role_${role}`).emit(event, data);
  }

  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}
