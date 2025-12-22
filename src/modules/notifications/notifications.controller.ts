import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../dto/common/pagination.dto';
import { SendNotificationDto } from './dto/notifications.dto';

// OPTIONAL (recommended)
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../schemas/user.schema';
import { RolesGuard } from '@/common/guards/roles.guard';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  // ======================================================
  // GET USER NOTIFICATIONS
  // ======================================================
  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  @ApiQuery({
    name: 'unreadOnly',
    type: Boolean,
    required: false,
    description: 'Show only unread notifications',
  })
  async getNotifications(
    @CurrentUser() user: any,
    @Query() paginationDto: PaginationDto,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.notificationsService.getUserNotifications(
      user.userId,
      paginationDto.page,
      paginationDto.limit,
      unreadOnly === true
    );
  }

  // ======================================================
  // UNREAD COUNT
  // ======================================================
  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.notificationsService.getUnreadCount(
      user.userId,
    );
    return { unreadCount: count };
  }

  // ======================================================
  // MARK ONE AS READ
  // ======================================================
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.notificationsService.markAsRead(id, user.userId);
    return { message: 'Notification marked as read' };
  }

  // ======================================================
  // MARK ALL AS READ
  // ======================================================
  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser() user: any) {
    await this.notificationsService.markAllAsRead(user.userId);
    return { message: 'All notifications marked as read' };
  }

  // ======================================================
  // DELETE SINGLE
  // ======================================================
  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.notificationsService.deleteNotification(
      id,
      user.userId,
    );
    return { message: 'Notification deleted' };
  }

  // ======================================================
  // DELETE ALL
  // ======================================================
  @Delete()
  @ApiOperation({ summary: 'Delete all notifications' })
  async deleteAllNotifications(@CurrentUser() user: any) {
    await this.notificationsService.deleteAllNotifications(
      user.userId,
    );
    return { message: 'All notifications deleted' };
  }

  // ======================================================
  // ADMIN / SYSTEM SEND NOTIFICATION
  // ======================================================
  @Post('send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Send system notification (ADMIN only)' })
  async sendNotification(@Body() dto: SendNotificationDto) {
    return this.notificationsService.createNotification({
      userId: dto.userId,
      type: dto.type,
      channel: dto.channel,
      title: dto.title,
      body: dto.body,
      data: dto.data,
    });
  }
}
