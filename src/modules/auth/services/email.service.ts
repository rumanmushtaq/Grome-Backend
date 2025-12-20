import {
  ISendEmail,
  ISendOTPEmailPayload,
} from "@/shared/interfaces/email.interface";
import { OtpEmailTemplate } from "@/templates/otpEmailTemplate";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as sgMail from "@sendgrid/mail";

@Injectable()
export class EmailService {
  private readonly FROM_EMAIL: string;
  constructor(private readonly configService: ConfigService) {
    const SENDGRID_API_KEY = this.configService.get<string>("SENDGRID_API_KEY");
    this.FROM_EMAIL = this.configService.get<string>("FROM_EMAIL");

    console.log("SENDGRID_API_KEY", SENDGRID_API_KEY);
    console.log("FROM_EMAIL", this.FROM_EMAIL);

    if (!SENDGRID_API_KEY || !this.FROM_EMAIL) {
      throw new Error("SendGrid configuration is missing!");
    }

    sgMail.setApiKey(SENDGRID_API_KEY);
  }

  // Send OTP Email
  async sendOTPEmail(payload: ISendOTPEmailPayload) {
    try {
      const { name, to, subject, otp } = payload;

      const otpEmailTemplate = OtpEmailTemplate(name, otp);

      await this.sendEmail({
        to,
        subject,
        html: otpEmailTemplate,
      });
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  // Send Email with SendGrid
  private async sendEmail(payload: ISendEmail) {
    const { to, subject, html } = payload;

    const msg = {
      to,
      from: this.FROM_EMAIL,
      subject,
      html,
    };

    const response = await sgMail.send(msg);

    return response;
  }
}
