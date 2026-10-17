import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Lets every request through; `req.user` is the logged-in user when a valid JWT was sent, else null */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(_error: unknown, user: TUser | false): TUser | null {
    return user || null;
  }
}
