import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../schemas/user.schema';

@ApiTags('jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get queue statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Queue statistics retrieved successfully' })
  async getQueueStats() {
    return this.jobsService.getQueueStats();
  }

  @Get('health')
  @ApiOperation({ summary: 'Get jobs health status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  async getHealthCheck() {
    return this.jobsService.healthCheck();
  }

  @Patch('queues/:queueName/pause')
  @ApiOperation({ summary: 'Pause a queue (Admin only)' })
  @ApiParam({ name: 'queueName', description: 'Queue name' })
  @ApiResponse({ status: 200, description: 'Queue paused successfully' })
  async pauseQueue(@Param('queueName') queueName: string) {
    await this.jobsService.pauseQueue(queueName);
    return { message: `Queue ${queueName} paused successfully` };
  }

  @Patch('queues/:queueName/resume')
  @ApiOperation({ summary: 'Resume a queue (Admin only)' })
  @ApiParam({ name: 'queueName', description: 'Queue name' })
  @ApiResponse({ status: 200, description: 'Queue resumed successfully' })
  async resumeQueue(@Param('queueName') queueName: string) {
    await this.jobsService.resumeQueue(queueName);
    return { message: `Queue ${queueName} resumed successfully` };
  }

  @Delete('queues/:queueName/clear')
  @ApiOperation({ summary: 'Clear a queue (Admin only)' })
  @ApiParam({ name: 'queueName', description: 'Queue name' })
  @ApiResponse({ status: 200, description: 'Queue cleared successfully' })
  async clearQueue(@Param('queueName') queueName: string) {
    await this.jobsService.clearQueue(queueName);
    return { message: `Queue ${queueName} cleared successfully` };
  }

  @Post('queues/:queueName/retry-failed')
  @ApiOperation({ summary: 'Retry failed jobs in a queue (Admin only)' })
  @ApiParam({ name: 'queueName', description: 'Queue name' })
  @ApiResponse({ status: 200, description: 'Failed jobs retried successfully' })
  async retryFailedJobs(@Param('queueName') queueName: string) {
    await this.jobsService.retryFailedJobs(queueName);
    return { message: `Failed jobs in queue ${queueName} retried successfully` };
  }

  @Post('notifications/send')
  @ApiOperation({ summary: 'Send a notification (Admin only)' })
  @ApiResponse({ status: 201, description: 'Notification queued successfully' })
  async sendNotification(@Body() data: {
    userId: string;
    type: string;
    channel: string;
    title: string;
    body: string;
    data?: any;
    bookingId?: string;
    conversationId?: string;
    fromUserId?: string;
  }) {
    const job = await this.jobsService.sendNotification(data);
    return { 
      message: 'Notification queued successfully',
      jobId: job.id,
    };
  }

  @Post('email/send-welcome')
  @ApiOperation({ summary: 'Send welcome email (Admin only)' })
  @ApiResponse({ status: 201, description: 'Welcome email queued successfully' })
  async sendWelcomeEmail(@Body() data: { userEmail: string; userName: string }) {
    const job = await this.jobsService.sendWelcomeEmail(data.userEmail, data.userName);
    return { 
      message: 'Welcome email queued successfully',
      jobId: job.id,
    };
  }

  @Post('email/send-booking-confirmation')
  @ApiOperation({ summary: 'Send booking confirmation email (Admin only)' })
  @ApiResponse({ status: 201, description: 'Booking confirmation email queued successfully' })
  async sendBookingConfirmationEmail(@Body() data: {
    userEmail: string;
    userName: string;
    barberName: string;
    scheduledAt: Date;
    services: any[];
  }) {
    const job = await this.jobsService.sendBookingConfirmation(data);
    return { 
      message: 'Booking confirmation email queued successfully',
      jobId: job.id,
    };
  }

  @Post('payments/process')
  @ApiOperation({ summary: 'Process payment (Admin only)' })
  @ApiResponse({ status: 201, description: 'Payment processing queued successfully' })
  async processPayment(@Body() data: {
    bookingId: string;
    amount: number;
    currency: string;
    paymentMethodId: string;
    customerId: string;
  }) {
    const job = await this.jobsService.processPayment(data);
    return { 
      message: 'Payment processing queued successfully',
      jobId: job.id,
    };
  }

  @Post('bookings/send-confirmation')
  @ApiOperation({ summary: 'Send booking confirmation notification (Admin only)' })
  @ApiResponse({ status: 201, description: 'Booking confirmation notification queued successfully' })
  async sendBookingConfirmationNotification(@Body() data: {
    bookingId: string;
    customerId: string;
    barberId: string;
    scheduledAt: Date;
    services: any[];
    customerName: string;
    barberName: string;
  }) {
    const job = await this.jobsService.sendBookingConfirmationNotification(data);
    return { 
      message: 'Booking confirmation notification queued successfully',
      jobId: job.id,
    };
  }
}
