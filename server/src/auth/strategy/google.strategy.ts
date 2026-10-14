import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import type { Request } from 'express';
import { GoogleUserDto } from '../dto/google-user.dto';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.SERVER_URL + '/api/auth/google/callback',
      passReqToCallback: true,
      scope: ['profile', 'email'],
    });
  }

  async validate(request: Request, accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) {
    const { emails } = profile;
    const email = emails!.filter((mail) => mail.value)[0].value;
    const googleUserInfo: GoogleUserDto = { email, profile };

    done(null, googleUserInfo);
  }
}
