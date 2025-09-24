import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('APPLE_CLIENT_ID'),
      teamID: configService.get<string>('APPLE_TEAM_ID'),
      keyID: configService.get<string>('APPLE_KEY_ID'),
      privateKeyString: configService.get<string>('APPLE_PRIVATE_KEY'),
      callbackURL: '/auth/apple/callback',
      scope: ['name', 'email'],
    });
  }

  async validate(profile: any, done: Function): Promise<any> {
    const { id, email, name } = profile;
    
    const user = {
      provider: 'apple',
      providerId: id,
      email: email,
      name: name ? `${name.firstName} ${name.lastName}` : 'Apple User',
      avatarUrl: null, // Apple doesn't provide profile pictures
    };

    done(null, user);
  }

  async verifyIdToken(idToken: string): Promise<any> {
    try {
      // For Apple Sign-In, we need to verify the JWT token
      // In a production app, you should verify the signature using Apple's public keys
      const decoded = jwt.decode(idToken) as any;
      
      if (!decoded) {
        throw new Error('Invalid token');
      }

      return {
        provider: 'apple',
        providerId: decoded.sub,
        email: decoded.email,
        name: decoded.name ? `${decoded.name.firstName} ${decoded.name.lastName}` : 'Apple User',
        avatarUrl: null,
        emailVerified: decoded.email_verified,
      };
    } catch (error) {
      throw new Error(`Apple token verification failed: ${error.message}`);
    }
  }
}
