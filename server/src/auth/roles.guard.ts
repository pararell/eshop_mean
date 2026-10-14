import type { User } from './models/user.model';
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
  private roles = ['admin'];
  constructor() {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user: User }>();
    const user = request.user;
    // Throws (500) when the user has no roles array; audit BUG-24
    if (user.roles!.filter((role) => this.roles.includes(role)).length) {
      return true;
    }

    throw new UnauthorizedException();
  }
}
