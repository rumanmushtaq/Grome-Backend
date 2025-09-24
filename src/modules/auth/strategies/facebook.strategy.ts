import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import axios from 'axios';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('FACEBOOK_APP_ID'),
      clientSecret: configService.get<string>('FACEBOOK_APP_SECRET'),
      callbackURL: '/auth/facebook/callback',
      profileFields: ['id', 'name', 'email', 'picture'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile, done: Function): Promise<any> {
    const { id, name, emails, photos } = profile;
    
    const user = {
      provider: 'facebook',
      providerId: id,
      email: emails?.[0]?.value,
      name: `${name.givenName} ${name.familyName}`,
      avatarUrl: photos?.[0]?.value,
    };

    done(null, user);
  }

  async verifyAccessToken(accessToken: string): Promise<any> {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
      );

      const { id, name, email, picture } = response.data;

      return {
        provider: 'facebook',
        providerId: id,
        email: email,
        name: name,
        avatarUrl: picture?.data?.url,
      };
    } catch (error) {
      throw new Error(`Facebook token verification failed: ${error.message}`);
    }
  }
}
