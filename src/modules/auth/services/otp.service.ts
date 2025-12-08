// ** Nest
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

// ** Entities
import { OtpDocument, OtpEntity } from '@/schemas/otp.schema';
import { ConfigService } from 'src/configs/configs.service';

@Injectable()
export class OtpService {
  constructor(
    @InjectModel(OtpEntity.name)
    private readonly otpModel: Model<OtpDocument>,
    private readonly configService: ConfigService
  ) {}


    // ** Create Otp
  async createOtp(email: string) {
    const otp = await this.generateOtp();
    return this.otpModel.create({
      email,
      otp,
    });
  }


    //   ** Find Otp by email and code
  async findOtpByEmailAndCode(email: string, otp: number) {
    return this.otpModel.findOne({
      email,
      otp,
    });
  }

  // ** Find Otp by email
  async findOtpByEmail(email: string) {
    return this.otpModel.findOne({
      email,
    });
  }


    // ** Delete Otp by email and code
  async deleteOtp(email: string, otp: number) {
    return this.otpModel.deleteOne({
      email,
      otp,
    });
  }


    // ** Generate Otp
  async generateOtp() {
    const otp = Math.floor(1000 + Math.random() * 9000);
    return otp;
  }

  async isOtpExpired(createdAt: Date): Promise<boolean> {
    const expirationTime = new Date(
      //it could be manually adjusted as needed 
      createdAt.getTime() + this.configService.OTP_EXPIRY_TIME* 60 * 1000,
    );
    return new Date() > expirationTime;
  }



}