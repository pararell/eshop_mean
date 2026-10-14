import { PassportSerializer } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  serializeUser(user: unknown, done: (err: Error | null, user: unknown) => void): void {
    done(null, user);
  }
  deserializeUser(payload: unknown, done: (err: Error | null, payload: unknown) => void): void {
    done(null, payload);
  }
}
