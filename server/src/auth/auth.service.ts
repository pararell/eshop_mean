import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { ConflictException, InternalServerErrorException } from '@nestjs/common';

import { GoogleUserDto } from './dto/google-user.dto';
import { User } from './models/user.model';
import { JwtPayload } from './models/jwt-payload.interface';
import { AuthCredentialDto, SignInDto } from './dto/auth-credential.dto';
import { Database, DRIZZLE } from '../db/database.module';
import { users } from '../db/schema';
import { findUserByEmail, pgErrorCode } from './user.queries';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private db: Database,
    private jwtService: JwtService,
  ) {}

  async signUp(authCredentialsDto: AuthCredentialDto): Promise<void> {
    const { email, password, name } = authCredentialsDto;
    const userExist = await findUserByEmail(this.db, email);
    if (userExist) {
      throw new ConflictException('Username already exist');
    }

    try {
      // Only whitelisted fields; never persist client-supplied roles or other user fields
      await this.db.insert(users).values({ email, name, passwordHash: await bcrypt.hash(password, await bcrypt.genSalt()) });
    } catch (error) {
      // unique_violation, e.g. a concurrent signup with the same email
      if (pgErrorCode(error) === '23505') {
        throw new ConflictException('Username already exist');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  async signIn(signInDto: SignInDto): Promise<{
    accessToken: string;
    id: string;
    email: string;
    roles?: string[];
  }> {
    const { email, password } = signInDto;
    const user = await findUserByEmail(this.db, email);
    const loggedUser = user && (await this.validatePassword(password, user));
    const userEmail = loggedUser ? user!.email : null;
    if (!userEmail) {
      throw new UnauthorizedException('Invalid credential');
    }

    const payload: JwtPayload = { email };
    const accessToken = await this.jwtService.sign(payload);

    return { accessToken, id: user!._id, roles: user!.roles, email };
  }

  async signInGoogle(googleUserDto: GoogleUserDto) {
    const { email, profile } = googleUserDto;
    const user = await findUserByEmail(this.db, email);

    if (!user) {
      await this.db.insert(users).values({ email, googleId: profile.id });
    }

    const payload: JwtPayload = { email };
    const accessToken: string = await this.jwtService.sign(payload);

    return accessToken;
  }

  private async validatePassword(password: string, user: User): Promise<boolean> {
    // bcrypt hashes embed their salt (decision D9). Throws for users without a password
    // (e.g. Google sign-ups), as before; audit BUG-23
    return bcrypt.compare(password, user.passwordHash!);
  }
}
