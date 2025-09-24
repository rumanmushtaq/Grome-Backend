import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private client: OAuth2Client;

  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: '/auth/google/callback',
      scope: ['email', 'profile'],
    });

    this.client = new OAuth2Client(
      configService.get<string>('GOOGLE_CLIENT_ID')
    );
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    const { id, name, emails, photos } = profile;
    
    const user = {
      provider: 'google',
      providerId: id,
      email: emails[0].value,
      name: name.givenName + ' ' + name.familyName,
      avatarUrl: photos[0].value,
    };

    done(null, user);
  }

  async verifyIdToken(idToken: string): Promise<any> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid token payload');
      }

      return {
        provider: 'google',
        providerId: payload.sub,
        email: payload.email,
        name: payload.name,
        avatarUrl: payload.picture,
        emailVerified: payload.email_verified,
      };
    } catch (error) {
      throw new Error(`Google token verification failed: ${error.message}`);
    }
  }
}
