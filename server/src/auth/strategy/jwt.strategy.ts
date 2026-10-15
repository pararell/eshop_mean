import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtPayload } from '../models/jwt-payload.interface';
import { User } from '../models/user.model';
import { Database, DRIZZLE } from '../../db/database.module';
import { findUserByEmail } from '../user.queries';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(DRIZZLE) private db: Database) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const { email } = payload;
    const user = await findUserByEmail(this.db, email);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
