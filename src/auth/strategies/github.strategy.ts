import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy } from 'passport-github2';
import { AuthService } from '../services/auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    try {
      const userData = {
        email:
          profile.emails && profile.emails[0]
            ? profile.emails[0].value
            : `${profile.username}@github.com`,
        username: profile.username || profile.login,
        picture:
          profile.photos && profile.photos[0] ? profile.photos[0].value : null,
        provider: 'github',
        accessToken,
        refreshToken,
      };

      const user = await this.authService.validateOAuthUser(userData);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}
