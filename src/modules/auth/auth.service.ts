import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  HttpException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

import { User, UserDocument } from "../../schemas/user.schema";
import { Barber, BarberDocument } from "../../schemas/barber.schema";
import {
  RefreshToken,
  RefreshTokenDocument,
} from "../../schemas/refresh-token.schema";
import {
  SignUpDto,
  SignInDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  VerifyPhoneDto,
  ChangePasswordDto,
  AuthResponseDto,
  SocialSignInDto,
  BarberSignUpDto,
} from "../../dto/auth/auth.dto";
import { OtpService } from "./otp.service";
import { getRandomDescription } from "./data/static";

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Barber.name) private barberModel: Model<BarberDocument>,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private otpService: OtpService
  ) {}

  async signUp(
    signUpDto: SignUpDto,
    deviceInfo?: any
  ): Promise<AuthResponseDto> {
    const { email, phone, password, name, deviceId, deviceName, deviceType } =
      signUpDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      throw new ConflictException(
        "User with this email or phone already exists"
      );
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user first
    const user = new this.userModel({
      email,
      phone,
      passwordHash,
      name,
      role: "customer",
      isVerified: false,
      isActive: true,
    });

    await user.save();

    // Send OTP to phone using Prelude.so
    const otpResult = await this.otpService.sendOtp(phone);

    // Update user with verification ID
    user.phoneVerificationId = otpResult.verificationId;
    user.phoneVerificationExpires = otpResult.expiresAt;
    await user.save();

    // Generate tokens with device information
    const tokens = await this.generateTokens(user._id.toString(), user.role, {
      deviceId: deviceId || uuidv4(),
      deviceName,
      deviceType,
      ...deviceInfo,
    });

    return {
      ...tokens,
      tokenType: "Bearer",
      user: {
        id: user._id.toString(),
        email: user.email,
        phone: user.phone,
        name: user.name,
        gender : user.gender,
        role: user.role,
        isVerified: user.isVerified,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async barberSignUp(
    barberSignUpDto: BarberSignUpDto,
    deviceInfo?: any
  ): Promise<AuthResponseDto> {
    const {
      name,
      shopName,
      email,
      phone,
      password,
      profileImage,
      idDocument1,
      idDocument2,
      location,
      yearsOfExperience,
      services,
      deviceId,
      deviceName,
      deviceType,
    } = barberSignUpDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      throw new ConflictException(
        "User with this email or phone already exists"
      );
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user first
    const user = new this.userModel({
      email,
      phone,
      passwordHash,
      name,
      shopName,
      role: "barber",
      avatarUrl: profileImage,
      isVerified: false,
      isActive: true,
      verification: {
        status: "pending",
        idDocUrl: idDocument1,
        certificateUrls: [idDocument2],
        submittedAt: new Date(),
      },
    });

    await user.save();

    // Create barber profile
    const barber = new this.barberModel({
      userId: user._id,
      location: {
        type: "Point",
        coordinates: [location.longitude, location.latitude],
      },
      description: getRandomDescription(),
      services: services.map((service) => ({
        serviceId: service.serviceId,
        price: service.price,
      })),
      experienceYears: yearsOfExperience,
      images: [profileImage],
      identificationDocuments: [idDocument1, idDocument2],
      isActive: true,
      isOnline: false,
    });

    await barber.save();

    // Send OTP to phone using Prelude.so
    const otpResult = await this.otpService.sendOtp(phone);

    // Update user with verification ID
    user.phoneVerificationId = otpResult.verificationId;
    user.phoneVerificationExpires = otpResult.expiresAt;
    await user.save();

    // Generate tokens with device information
    const tokens = await this.generateTokens(user._id.toString(), user.role, {
      deviceId: deviceId || uuidv4(),
      deviceName,
      deviceType,
      ...deviceInfo,
    });

    return {
      ...tokens,
      tokenType: "Bearer",
      user: {
        id: user._id.toString(),
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role,
        gender: user.gender,
        isVerified: user.isVerified,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async signIn(
    signInDto: SignInDto,
    deviceInfo?: any
  ): Promise<AuthResponseDto> {
    const { identifier, password, deviceId, deviceName, deviceType } =
      signInDto;

    // Find user by email or phone
    const user = await this.userModel.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException("Account is deactivated");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate tokens
    const tokens = await this.generateTokens(user._id.toString(), user.role, {
      deviceId: deviceId || uuidv4(),
      deviceName,
      deviceType,
      ...deviceInfo,
    });

    return {
      ...tokens,
      tokenType: "Bearer",
      user: {
        id: user._id.toString(),
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role,
        gender: user.gender,
        isVerified: user.isVerified,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async refreshToken(
    refreshTokenDto: RefreshTokenDto
  ): Promise<AuthResponseDto> {
    const { refreshToken, deviceId } = refreshTokenDto;

    // Find refresh token
    const tokenDoc = await this.refreshTokenModel.findOne({
      tokenHash: await this.hashToken(refreshToken),
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Get user
    const user = await this.userModel.findById(tokenDoc.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException("User not found or inactive");
    }

    // Rotate refresh token
    await this.revokeRefreshToken(tokenDoc._id.toString());
    const newTokens = await this.generateTokens(
      user._id.toString(),
      user.role,
      {
        deviceId: deviceId || tokenDoc.deviceId,
        deviceName: tokenDoc.deviceName,
        deviceType: tokenDoc.deviceType,
      }
    );

    return {
      ...newTokens,
      tokenType: "Bearer",
      user: {
        id: user._id.toString(),
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role,
        gender: user.gender,
        isVerified: user.isVerified,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async signOut(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Revoke specific refresh token
      const tokenHash = await this.hashToken(refreshToken);
      await this.refreshTokenModel.updateOne(
        { tokenHash, userId },
        { isRevoked: true, revokedAt: new Date() }
      );
    } else {
      // Revoke all refresh tokens for user
      await this.refreshTokenModel.updateMany(
        { userId, isRevoked: false },
        { isRevoked: true, revokedAt: new Date() }
      );
    }
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.passwordHash = newPasswordHash;
    await user.save();

    // Revoke all refresh tokens
    await this.refreshTokenModel.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() }
    );
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const { email } = forgotPasswordDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not
      return;
    }

    // Generate reset token
    const resetToken = uuidv4();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Store reset token (in a real app, you'd store this in a separate collection)
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetTokenExpiry;
    await user.save();

    // TODO: Send email with reset link
    console.log(`Password reset token for ${email}: ${resetToken}`);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.userModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    user.passwordHash = passwordHash;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Revoke all refresh tokens
    await this.refreshTokenModel.updateMany(
      { userId: user._id, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() }
    );
  }

  async verifyPhone(verifyPhoneDto: VerifyPhoneDto): Promise<void> {
    const { phone, code } = verifyPhoneDto;

    // Find user by phone
    const user = await this.userModel.findOne({ phone });
    if (!user) {
      throw new BadRequestException("User not found");
    }

    if (!user.phoneVerificationId) {
      throw new BadRequestException("No verification session found");
    }

    // Verify OTP code using Prelude.so
    const isValid = await this.otpService.verifyOtp(
      user.phoneVerificationId,
      code
    );
    if (!isValid) {
      throw new BadRequestException("Invalid or expired verification code");
    }

    // Mark user as verified
    user.isVerified = true;
    user.phoneVerifiedAt = new Date();
    user.phoneVerificationId = undefined;
    user.phoneVerificationExpires = undefined;
    await user.save();
  }

  async resendPhoneVerification(phone: string): Promise<void> {
    // Find user by phone
    const user = await this.userModel.findOne({ phone });
    if (!user) {
      throw new BadRequestException("User not found");
    }

    if (user.isVerified) {
      throw new BadRequestException("Phone number is already verified");
    }

    // Send new OTP using Prelude.so
    const otpResult = await this.otpService.sendOtp(phone);

    // Update user with new verification ID
    user.phoneVerificationId = otpResult.verificationId;
    user.phoneVerificationExpires = otpResult.expiresAt;
    await user.save();
  }

  async validateUser(userId: string): Promise<UserDocument | null> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.isActive) {
      return null;
    }
    return user;
  }

  async findUserByIdentifier(identifier: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });
  }

  async verifyPassword(
    password: string,
    passwordHash: string
  ): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  // async socialSignIn(socialSignInDto: SocialSignInDto, deviceInfo?: any): Promise<AuthResponseDto> {
  //   const { provider, idToken, deviceId, deviceName, deviceType } = socialSignInDto;

  //   const isGoogleConfigured = this.configService.get<string>('GOOGLE_CLIENT_ID');
  //   const isFacebookConfigured = this.configService.get<string>('FACEBOOK_APP_ID');
  //   const isAppleConfigured = this.configService.get<string>('APPLE_CLIENT_ID');

  //   let socialUserData: any;

  //   try {
  //     switch (provider) {
  //       case 'google':
  //         if (!isGoogleConfigured) {
  //           throw new BadRequestException('Google authentication is not configured');
  //         }
  //         const { GoogleStrategy } = await import('./strategies/google.strategy');
  //         const googleStrategy = new GoogleStrategy(this.configService);
  //         socialUserData = await googleStrategy.verifyIdToken(idToken);
  //         break;
  //       case 'facebook':
  //         if (!isFacebookConfigured) {
  //           throw new BadRequestException('Facebook authentication is not configured');
  //         }
  //         const { FacebookStrategy } = await import('./strategies/facebook.strategy');
  //         const facebookStrategy = new FacebookStrategy(this.configService);
  //         socialUserData = await facebookStrategy.verifyAccessToken(idToken);
  //         break;
  //       case 'apple':
  //         if (!isAppleConfigured) {
  //           throw new BadRequestException('Apple authentication is not configured');
  //         }
  //         const { AppleStrategy } = await import('./strategies/apple.strategy');
  //         const appleStrategy = new AppleStrategy(this.configService);
  //         socialUserData = await appleStrategy.verifyIdToken(idToken);
  //         break;
  //       default:
  //         throw new BadRequestException('Unsupported social provider');
  //     }
  //   } catch (error) {
  //     throw new UnauthorizedException(`Social authentication failed: ${error.message}`);
  //   }

  //   // Check if user exists by social provider ID or email
  //   let user = await this.userModel.findOne({
  //     $or: [
  //       { 'socialAuth.providerId': socialUserData.providerId, 'socialAuth.provider': provider },
  //       { email: socialUserData.email }
  //     ]
  //   });

  //   if (user) {
  //     // Update social auth info if user exists but doesn't have social auth
  //     if (!user.socialAuth || user.socialAuth.provider !== provider) {
  //       user.socialAuth = {
  //         provider: provider as 'google' | 'facebook' | 'apple',
  //         providerId: socialUserData.providerId,
  //         providerEmail: socialUserData.email,
  //         providerName: socialUserData.name,
  //         providerAvatar: socialUserData.avatarUrl,
  //       };
  //       await user.save();
  //     }
  //   } else {
  //     // Create new user
  //     user = new this.userModel({
  //       email: socialUserData.email,
  //       name: socialUserData.name,
  //       role: 'customer',
  //       isVerified: socialUserData.emailVerified || true,
  //       isActive: true,
  //       socialAuth: {
  //         provider: provider as 'google' | 'facebook' | 'apple',
  //         providerId: socialUserData.providerId,
  //         providerEmail: socialUserData.email,
  //         providerName: socialUserData.name,
  //         providerAvatar: socialUserData.avatarUrl,
  //       },
  //     });
  //     await user.save();
  //   }

  //   // Check if user is active
  //   if (!user.isActive) {
  //     throw new UnauthorizedException('Account is deactivated');
  //   }

  //   // Update last login
  //   user.lastLoginAt = new Date();
  //   await user.save();

  //   // Generate tokens
  //   const tokens = await this.generateTokens(user._id.toString(), user.role, {
  //     deviceId: deviceId || uuidv4(),
  //     deviceName,
  //     deviceType,
  //     ...deviceInfo,
  //   });

  //   return {
  //     ...tokens,
  //     tokenType: 'Bearer',
  //     user: {
  //       id: user._id.toString(),
  //       email: user.email,
  //       phone: user.phone,
  //       name: user.name,
  //       role: user.role,
  //       isVerified: user.isVerified,
  //       avatarUrl: user.avatarUrl || user.socialAuth?.providerAvatar,
  //     },
  //   };

  // }

  async socialSignIn(
    socialSignInDto: SocialSignInDto,
    deviceInfo?: any
  ): Promise<AuthResponseDto> {
    const { provider, idToken, deviceId, deviceName, deviceType } =
      socialSignInDto;

    const isGoogleConfigured =
      this.configService.get<string>("GOOGLE_CLIENT_ID");
    const isFacebookConfigured =
      this.configService.get<string>("FACEBOOK_APP_ID");
    const isAppleConfigured = this.configService.get<string>("APPLE_CLIENT_ID");

    let socialUserData: any;
    let user;

    try {
      // ✅ STEP 1: Validate provider configuration and verify token
      try {
        switch (provider) {
          case "google": {
            if (!isGoogleConfigured) {
              throw new BadRequestException(
                "Google authentication is not configured"
              );
            }
            const { GoogleStrategy } = await import(
              "./strategies/google.strategy"
            );
            const googleStrategy = new GoogleStrategy(this.configService);
            socialUserData = await googleStrategy.verifyIdToken(idToken);
            break;
          }
          case "facebook": {
            if (!isFacebookConfigured) {
              throw new BadRequestException(
                "Facebook authentication is not configured"
              );
            }
            const { FacebookStrategy } = await import(
              "./strategies/facebook.strategy"
            );
            const facebookStrategy = new FacebookStrategy(this.configService);
            socialUserData = await facebookStrategy.verifyAccessToken(idToken);
            break;
          }
          case "apple": {
            if (!isAppleConfigured) {
              throw new BadRequestException(
                "Apple authentication is not configured"
              );
            }
            const { AppleStrategy } = await import(
              "./strategies/apple.strategy"
            );
            const appleStrategy = new AppleStrategy(this.configService);
            socialUserData = await appleStrategy.verifyIdToken(idToken);
            break;
          }
          default:
            throw new BadRequestException("Unsupported social provider");
        }
      } catch (error) {
        // 🔴 Catch errors during social verification
        throw new UnauthorizedException(
          `Social authentication failed: ${error.message}`
        );
      }

      // ✅ STEP 2: Lookup or create user
      try {
        user = await this.userModel.findOne({
          $or: [
            {
              "socialAuth.providerId": socialUserData.providerId,
              "socialAuth.provider": provider,
            },
            { email: socialUserData.email },
          ],
        });

        if (user) {
          // Update social data if outdated
          if (!user.socialAuth || user.socialAuth.provider !== provider) {
            user.socialAuth = {
              provider: provider as "google" | "facebook" | "apple",
              providerId: socialUserData.providerId,
              providerEmail: socialUserData.email,
              providerName: socialUserData.name,
              providerAvatar: socialUserData.avatarUrl,
            };
            await user.save();
          }
        } else {
          // Create a new user
          user = new this.userModel({
            email: socialUserData.email,
            name: socialUserData.name,
            role: "customer",
            isVerified: socialUserData.emailVerified || true,
            isActive: true,
            socialAuth: {
              provider: provider as "google" | "facebook" | "apple",
              providerId: socialUserData.providerId,
              providerEmail: socialUserData.email,
              providerName: socialUserData.name,
              providerAvatar: socialUserData.avatarUrl,
            },
          });
          await user.save();
        }
      } catch (error) {
        // 🔴 Catch database issues
        throw new InternalServerErrorException(
          `User creation or lookup failed: ${error.message}`
        );
      }

      // ✅ STEP 3: Validate user status
      if (!user.isActive) {
        throw new UnauthorizedException("Account is deactivated");
      }

      // ✅ STEP 4: Update last login timestamp
      try {
        user.lastLoginAt = new Date();
        await user.save();
      } catch (error) {
        // Log error but don’t block login if timestamp fails
        console.warn("⚠️ Failed to update lastLoginAt:", error.message);
      }

      // ✅ STEP 5: Generate tokens
      let tokens;
      try {
        tokens = await this.generateTokens(user._id.toString(), user.role, {
          deviceId: deviceId || uuidv4(),
          deviceName,
          deviceType,
          ...deviceInfo,
        });
      } catch (error) {
        throw new InternalServerErrorException(
          `Token generation failed: ${error.message}`
        );
      }

      // ✅ STEP 6: Return final response
      return {
        ...tokens,
        tokenType: "Bearer",
        user: {
          id: user._id.toString(),
          email: user.email,
          phone: user.phone,
          name: user.name,
          role: user.role,
          isVerified: user.isVerified,
          avatarUrl: user.avatarUrl || user.socialAuth?.providerAvatar,
        },
      };
    } catch (error) {
      // 🔴 Global catch block for unexpected failures
      console.error("❌ Social Sign-in Error:", error);

      if (error instanceof HttpException) {
        throw error; // Re-throw known HTTP exceptions
      }

      throw new InternalServerErrorException(
        "An unexpected error occurred during social sign-in"
      );
    }
  }

  private async generateTokens(
    userId: string,
    role: string,
    deviceInfo?: any
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const payload = { sub: userId, role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();

    // Store refresh token
    const refreshTokenDoc = new this.refreshTokenModel({
      userId,
      tokenHash: await this.hashToken(refreshToken),
      deviceId: deviceInfo?.deviceId || uuidv4(),
      deviceName: deviceInfo?.deviceName,
      deviceType: deviceInfo?.deviceType,
      ipAddress: deviceInfo?.ipAddress,
      userAgent: deviceInfo?.userAgent,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    await refreshTokenDoc.save();

    const expiresIn = this.configService.get<number>("jwt.expiresIn") || 900; // 15 minutes

    return {
      accessToken,
      refreshToken,
      expiresIn:
        typeof expiresIn === "string"
          ? this.parseExpiration(expiresIn)
          : expiresIn,
    };
  }

  private async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  private async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.refreshTokenModel.findByIdAndUpdate(tokenId, {
      isRevoked: true,
      revokedAt: new Date(),
    });
  }

  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default to 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 60 * 60;
      case "d":
        return value * 60 * 60 * 24;
      default:
        return 900;
    }
  }
}
