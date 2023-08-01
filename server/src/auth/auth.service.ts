import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { ConflictException, InternalServerErrorException } from '@nestjs/common';

import { GoogleUserDto } from './dto/google-user.dto';
import { User } from './models/user.model';
import { JwtPayload } from './models/jwt-payload.interface';
import { AuthCredentialDto } from './dto/auth-credential.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async signUp(authCredentialsDto: AuthCredentialDto): Promise<void> {
    const { email, password } = authCredentialsDto;
    const userExist = await this.userModel.findOne({ email });
    if (userExist) {
      throw new ConflictException('Username already exist');
    }
    const user = new this.userModel(authCredentialsDto);
    user.salt = await bcrypt.genSalt();
    user.password = await this.hashPassword(password, user.salt);

    try {
      await user.save();
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Username already exist');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  async signIn(authCredentialsDto: AuthCredentialDto): Promise<{ accessToken: string; id: string; email: string; roles?: string[] }> {
    const { email, password } = authCredentialsDto;
    const user = await this.userModel.findOne({ email });
    const loggedUser = user && (await this.validatePassword(password, user));
    const userEmail = loggedUser ? user.email : null;
    if (!userEmail) {
      throw new UnauthorizedException('Invalid credential');
    }

    const payload: JwtPayload = { email };
    const accessToken = await this.jwtService.sign(payload);

    return { accessToken, id: user._id, roles: user.roles, email };
  }

  async signInGoogle(googleUserDto: GoogleUserDto) {
    const { email, profile } = googleUserDto;
    const user = await this.userModel.findOne({ email });

    if (!user) {
      const googleUser = await new this.userModel({ email, googleId: profile.id });
      googleUser.save();
    }

    const payload: JwtPayload = { email };
    const accessToken: string = await this.jwtService.sign(payload);

    return accessToken;
  }

  async getGoogleUser(email: string, profile: any) {
    const user = this.userModel.findOne({ email });
    const googleUser = user || (await new this.userModel({ email, googleId: profile.id }));

    return googleUser;
  }

  private async hashPassword(password: string, salt: string): Promise<string> {
    return bcrypt.hash(password, salt);
  }

  private async validatePassword(password: string, user: User): Promise<boolean> {
    const hash = await bcrypt.hash(password, user.salt);
    return hash === user.password;
  }
}
