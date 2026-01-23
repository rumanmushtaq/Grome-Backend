import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from "@nestjs/swagger";

import { ChatService } from "./chat.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PaginationDto } from "../../dto/common/pagination.dto";
import { MessageType } from "../../schemas/chat-message.schema";
import { CreateConversationDto, CreateMessageDto } from "./dtos/chat.dto";

@ApiTags("chat")
@Controller("chat")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post("conversations")
  @ApiOperation({ summary: "Create a new conversation" })
  @ApiResponse({
    status: 201,
    description: "Conversation created successfully",
  })
  @ApiBody({ type: CreateConversationDto }) // 👈 Add this line
  async createConversation(
    @CurrentUser() user: any,
    @Body() body: CreateConversationDto,
  ) {
    return this.chatService.createConversation(
      user.userId,
      body.barberId,
      body.bookingId,
    );
  }

  @Get("conversations")
  @ApiOperation({ summary: "Get user conversations" })
  @ApiResponse({
    status: 200,
    description: "Conversations retrieved successfully",
  })
  async getConversations(
    @CurrentUser() user: any,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.chatService.getConversations(
      user.userId,
      paginationDto.page,
      paginationDto.limit,
      user.role,
    );
  }

  @Get("conversations/:id")
  @ApiOperation({ summary: "Get conversation by ID" })
  @ApiParam({ name: "id", description: "Conversation ID" })
  @ApiResponse({
    status: 200,
    description: "Conversation retrieved successfully",
  })
  async getConversationById(@Param("id") id: string, @CurrentUser() user: any) {
    console.log("user", user);
    return this.chatService.getConversationById(id, user.userId, user.role);
  }

  @Get("conversations/:id/messages")
  @ApiOperation({ summary: "Get conversation messages" })
  @ApiParam({ name: "id", description: "Conversation ID" })
  @ApiResponse({ status: 200, description: "Messages retrieved successfully" })
  async getMessages(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.chatService.getMessages(
      id,
      user.userId,
      user.role,
      paginationDto.page,
      paginationDto.limit,
    );
  }

  @Post("conversations/:id/messages")
  @ApiOperation({ summary: "Send a message" })
  @ApiParam({ name: "id", description: "Conversation ID" })
  @ApiResponse({ status: 201, description: "Message sent successfully" })
  async sendMessage(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Body() body: CreateMessageDto,
  ) {
    return this.chatService.createMessage({
      conversationId: id,
      fromUserId: user.userId,
      message: body.message,
      type: body.type as MessageType,
      attachments: body.attachments,
    });
  }

  @Patch("conversations/:id/read")
  @ApiOperation({ summary: "Mark conversation messages as read" })
  @ApiParam({ name: "id", description: "Conversation ID" })
  @ApiResponse({ status: 200, description: "Messages marked as read" })
  async markAsRead(@Param("id") id: string, @CurrentUser() user: any) {
    await this.chatService.markMessagesAsRead(id, user.userId);
    return { message: "Messages marked as read" };
  }

  @Patch("conversations/:id/archive")
  @ApiOperation({ summary: "Archive conversation" })
  @ApiParam({ name: "id", description: "Conversation ID" })
  @ApiResponse({ status: 200, description: "Conversation archived" })
  async archiveConversation(@Param("id") id: string, @CurrentUser() user: any) {
    await this.chatService.archiveConversation(id, user.userId);
    return { message: "Conversation archived" };
  }

  @Patch("conversations/:id/unarchive")
  @ApiOperation({ summary: "Unarchive conversation" })
  @ApiParam({ name: "id", description: "Conversation ID" })
  @ApiResponse({ status: 200, description: "Conversation unarchived" })
  async unarchiveConversation(
    @Param("id") id: string,
    @CurrentUser() user: any,
  ) {
    await this.chatService.unarchiveConversation(id, user.userId);
    return { message: "Conversation unarchived" };
  }

  @Get("unread-count")
  @ApiOperation({ summary: "Get total unread message count" })
  @ApiResponse({ status: 200, description: "Unread count retrieved" })
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.chatService.getUnreadCount(user.userId);
    return { unreadCount: count };
  }

  @Get("search")
  @ApiOperation({ summary: "Search messages" })
  @ApiQuery({ name: "q", description: "Search query" })
  @ApiQuery({
    name: "conversationId",
    description: "Conversation ID (optional)",
    required: false,
  })
  @ApiResponse({ status: 200, description: "Search results retrieved" })
  async searchMessages(
    @CurrentUser() user: any,
    @Query("q") query: string,
    @Query() paginationDto: PaginationDto,
    @Query("conversationId") conversationId?: string,
  ) {
    return this.chatService.searchMessages(
      user.userId,
      query,
      conversationId,
      paginationDto.page,
      paginationDto.limit,
    );
  }
}
