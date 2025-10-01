import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SignUpDto, SignInDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, VerifyPhoneDto, ResendPhoneVerificationDto, ChangePasswordDto, AuthResponseDto, SocialSignInDto, BarberSignUpDto } from '../../dto/auth/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async signUp(@Body() signUpDto: SignUpDto, @Request() req): Promise<AuthResponseDto> {
    const deviceInfo = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    return this.authService.signUp(signUpDto, deviceInfo);
  }

  @Post('barber-signup')
  @ApiOperation({ summary: 'Register a new barber' })
  @ApiResponse({ status: 201, description: 'Barber successfully registered', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'Barber already exists' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async barberSignUp(@Body() barberSignUpDto: BarberSignUpDto, @Request() req): Promise<AuthResponseDto> {
    const deviceInfo = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    return this.authService.barberSignUp(barberSignUpDto, deviceInfo);
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in user' })
  @ApiResponse({ status: 200, description: 'User successfully signed in', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async signIn(@Body() signInDto: SignInDto, @Request() req): Promise<AuthResponseDto> {
    const deviceInfo = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    return this.authService.signIn(signInDto, deviceInfo);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token successfully refreshed', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('signout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sign out user' })
  @ApiResponse({ status: 200, description: 'User successfully signed out' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async signOut(@Request() req, @Body() body?: { refreshToken?: string }): Promise<{ message: string }> {
    await this.authService.signOut(req.user.userId, body?.refreshToken);
    return { message: 'Successfully signed out' };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password successfully changed' })
  @ApiResponse({ status: 401, description: 'Unauthorized or invalid current password' })
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    await this.authService.changePassword(req.user.userId, changePasswordDto);
    return { message: 'Password successfully changed' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.forgotPassword(forgotPasswordDto);
    return { message: 'If the email exists, a password reset link has been sent' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset user password' })
  @ApiResponse({ status: 200, description: 'Password successfully reset' })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(resetPasswordDto);
    return { message: 'Password successfully reset' };
  }

  @Post('verify-phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify user phone number with OTP' })
  @ApiResponse({ status: 200, description: 'Phone successfully verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired verification code' })
  async verifyPhone(@Body() verifyPhoneDto: VerifyPhoneDto): Promise<{ message: string }> {
    await this.authService.verifyPhone(verifyPhoneDto);
    return { message: 'Phone successfully verified' };
  }

  @Post('resend-phone-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend phone verification OTP' })
  @ApiResponse({ status: 200, description: 'Verification code resent' })
  @ApiResponse({ status: 400, description: 'User not found or already verified' })
  async resendPhoneVerification(@Body() resendPhoneVerificationDto: ResendPhoneVerificationDto): Promise<{ message: string }> {
    await this.authService.resendPhoneVerification(resendPhoneVerificationDto.phone);
    return { message: 'Verification code resent' };
  }

  @Post('social-signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with social provider (Google, Facebook, Apple)' })
  @ApiResponse({ status: 200, description: 'User successfully signed in', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid social token' })
  @ApiResponse({ status: 400, description: 'Invalid provider or token' })
  async socialSignIn(@Body() socialSignInDto: SocialSignInDto, @Request() req): Promise<AuthResponseDto> {
    const deviceInfo = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };
    return this.authService.socialSignIn(socialSignInDto, deviceInfo);
  }
}
