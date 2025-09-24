import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.prelude.dev/v2';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('sms.prelude.apiKey');
  }

  /**
   * Send OTP via SMS using Prelude.so (or static OTP in development)
   */
  async sendOtp(phone: string): Promise<{ verificationId: string; expiresAt: Date }> {
    const isDevelopment = this.configService.get<string>('nodeEnv') === 'development';
    
    if (isDevelopment) {
      // Use static OTP for development
      const staticOtp = '123456';
      const verificationId = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.logger.log(`🔧 DEVELOPMENT MODE: Static OTP ${staticOtp} for phone ${phone}`);
      this.logger.log(`📱 Use OTP code: ${staticOtp} to verify phone number`);
      
      return {
        verificationId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      };
    }

    // Production: Use Prelude.so API
    if (!this.apiKey) {
      this.logger.warn('Prelude API key not configured, SMS not sent');
      throw new Error('SMS service not configured');
    }

    try {
      this.logger.log(`Sending OTP to phone ${phone}`);
      
      const response = await fetch(`${this.baseUrl}/verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: {
            type: 'phone_number',
            value: phone,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.logger.log(`OTP sent successfully to ${phone}, verification ID: ${data.id}`);
      
      return {
        verificationId: data.id,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      };
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${phone}:`, error);
      throw new Error('Failed to send verification code');
    }
  }

  /**
   * Verify OTP code using Prelude.so (or static OTP in development)
   */
  async verifyOtp(verificationId: string, code: string): Promise<boolean> {
    const isDevelopment = this.configService.get<string>('nodeEnv') === 'development';
    
    if (isDevelopment) {
      // Use static OTP for development
      const staticOtp = '123456';
      const isValid = code === staticOtp;
      
      this.logger.log(`🔧 DEVELOPMENT MODE: Verifying OTP ${code} (expected: ${staticOtp})`);
      this.logger.log(`✅ OTP verification result: ${isValid ? 'valid' : 'invalid'}`);
      
      return isValid;
    }

    // Production: Use Prelude.so API
    if (!this.apiKey) {
      this.logger.warn('Prelude API key not configured');
      throw new Error('SMS service not configured');
    }

    try {
      this.logger.log(`Verifying OTP code for verification ID: ${verificationId}`);
      
      const response = await fetch(`${this.baseUrl}/verification/check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationId: verificationId,
          code: code,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const isValid = data.status === 'approved';
      this.logger.log(`OTP verification result: ${isValid ? 'valid' : 'invalid'}`);
      
      return isValid;
    } catch (error) {
      this.logger.error(`Failed to verify OTP:`, error);
      return false;
    }
  }

  /**
   * Legacy method for backward compatibility - generates a 6-digit OTP code
   * This is no longer used with Prelude.so as they handle OTP generation
   */
  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Legacy method for backward compatibility - generates OTP expiry time
   * This is no longer used with Prelude.so as they handle expiration
   */
  generateOtpExpiry(): Date {
    return new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Legacy method for backward compatibility - checks if OTP is valid
   * This is no longer used with Prelude.so as they handle validation
   */
  isOtpValid(code: string, storedCode: string, expiresAt: Date): boolean {
    if (!code || !storedCode || !expiresAt) {
      return false;
    }

    if (new Date() > expiresAt) {
      return false;
    }

    return code === storedCode;
  }
}
