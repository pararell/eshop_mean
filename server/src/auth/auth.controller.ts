import type { Request, Response } from 'express';
import type { CurrentUser } from '@eshop/shared';
import { Controller, Post, Body, ValidationPipe, UseGuards, Get, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { AuthCredentialDto, SignInDto } from './dto/auth-credential.dto';
import { AuthService } from './auth.service';
import { User } from './models/user.model';
import { GetUser } from './utils/get-user.decorator';
import { GoogleUserDto } from './dto/google-user.dto';
import { RateLimited } from '../shared/rate-limit/rate-limit';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  getUser(@GetUser() user: User): CurrentUser {
    return { id: user._id, email: user.email, roles: user.roles };
  }

  @RateLimited()
  @Post('/signup')
  signUp(@Body(ValidationPipe) authCredentialsDto: AuthCredentialDto): Promise<void> {
    return this.authService.signUp(authCredentialsDto);
  }

  @RateLimited()
  @Post('/signin')
  signIn(@Body(ValidationPipe) signInDto: SignInDto): Promise<{
    accessToken: string;
    id: string;
    email: string;
    roles?: string[];
  }> {
    return this.authService.signIn(signInDto);
  }

  @Get('/google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  @Get('/google/callback')
  @UseGuards(AuthGuard('google'))
  async googleLoginCallback(@Req() req: Request, @Res() res: Response) {
    const googleUserDto = req.user as GoogleUserDto;
    const accessToken = await this.authService.signInGoogle(googleUserDto);
    const tokenUrl = process.env.ORIGIN + '/jwtToken/' + accessToken;
    res.redirect(tokenUrl);
  }
}
