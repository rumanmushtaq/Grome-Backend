import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('email.smtp.host'),
      port: this.configService.get('email.smtp.port'),
      secure: false,
      auth: {
        user: this.configService.get('email.smtp.user'),
        pass: this.configService.get('email.smtp.pass'),
      },
    });
  }

  @Process('send-welcome-email')
  async handleSendWelcomeEmail(job: any) {
    this.logger.log(`Processing welcome email job: ${job.id}`);
    
    const { userEmail, userName } = job.data;
    
    try {
      await this.transporter.sendMail({
        from: this.configService.get('email.smtp.user'),
        to: userEmail,
        subject: 'Welcome to Grome!',
        html: `
          <h1>Welcome to Grome, ${userName}!</h1>
          <p>Thank you for joining our barbershop booking platform.</p>
          <p>You can now book appointments with professional barbers in your area.</p>
          <p>Get started by browsing available barbers near you!</p>
        `,
      });
      
      this.logger.log(`Welcome email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${userEmail}:`, error);
      throw error;
    }
  }

  @Process('send-booking-confirmation')
  async handleSendBookingConfirmation(job: any) {
    this.logger.log(`Processing booking confirmation email job: ${job.id}`);
    
    const { userEmail, userName, barberName, scheduledAt, services } = job.data;
    
    try {
      const servicesList = services.map(service => 
        `<li>${service.name} - $${service.price} (${service.duration} min)</li>`
      ).join('');

      await this.transporter.sendMail({
        from: this.configService.get('email.smtp.user'),
        to: userEmail,
        subject: 'Booking Confirmation - Grome',
        html: `
          <h1>Booking Confirmed!</h1>
          <p>Hi ${userName},</p>
          <p>Your booking with ${barberName} has been confirmed.</p>
          <p><strong>Scheduled for:</strong> ${new Date(scheduledAt).toLocaleString()}</p>
          <p><strong>Services:</strong></p>
          <ul>${servicesList}</ul>
          <p>We'll send you a reminder before your appointment.</p>
        `,
      });
      
      this.logger.log(`Booking confirmation email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send booking confirmation to ${userEmail}:`, error);
      throw error;
    }
  }

  @Process('send-booking-reminder')
  async handleSendBookingReminder(job: any) {
    this.logger.log(`Processing booking reminder email job: ${job.id}`);
    
    const { userEmail, userName, barberName, scheduledAt } = job.data;
    
    try {
      await this.transporter.sendMail({
        from: this.configService.get('email.smtp.user'),
        to: userEmail,
        subject: 'Booking Reminder - Grome',
        html: `
          <h1>Booking Reminder</h1>
          <p>Hi ${userName},</p>
          <p>This is a reminder that you have a booking with ${barberName} tomorrow.</p>
          <p><strong>Scheduled for:</strong> ${new Date(scheduledAt).toLocaleString()}</p>
          <p>Please arrive on time for your appointment.</p>
        `,
      });
      
      this.logger.log(`Booking reminder email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send booking reminder to ${userEmail}:`, error);
      throw error;
    }
  }

  @Process('send-password-reset')
  async handleSendPasswordReset(job: any) {
    this.logger.log(`Processing password reset email job: ${job.id}`);
    
    const { userEmail, userName, resetToken } = job.data;
    const resetUrl = `${this.configService.get('CORS_ORIGIN')}/reset-password?token=${resetToken}`;
    
    try {
      await this.transporter.sendMail({
        from: this.configService.get('email.smtp.user'),
        to: userEmail,
        subject: 'Password Reset - Grome',
        html: `
          <h1>Password Reset Request</h1>
          <p>Hi ${userName},</p>
          <p>You requested a password reset for your Grome account.</p>
          <p>Click the link below to reset your password:</p>
          <p><a href="${resetUrl}">Reset Password</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });
      
      this.logger.log(`Password reset email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset to ${userEmail}:`, error);
      throw error;
    }
  }
}
