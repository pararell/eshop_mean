import { Controller, Post, Body, ValidationPipe, UseGuards, Get, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { AuthCredentialDto } from './dto/auth-credential.dto';
import { AuthService } from './auth.service';
import { User } from './models/user.model';
import { GetUser } from './utils/get-user.decorator';
import { GoogleUserDto } from './dto/google-user.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  getUser(@GetUser() user: User): { id: string; email: string; roles: string[] } {
    return { id: user._id, email: user.email, roles: user.roles };
  }

  @Post('/signup')
  signUp(@Body(ValidationPipe) authCredentialsDto: AuthCredentialDto): Promise<void> {
    return this.authService.signUp(authCredentialsDto);
  }

  @Post('/signin')
  signIn(@Body(ValidationPipe) authCredentialsDto: AuthCredentialDto): Promise<{ accessToken: string; id: string; email: string; roles?: string[] }> {
    return this.authService.signIn(authCredentialsDto);
  }

  @Get('/google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  @Get('/google/callback')
  @UseGuards(AuthGuard('google'))
  async googleLoginCallback(@Req() req, @Res() res) {
    const googleUserDto: GoogleUserDto = req.user;
    const accessToken = await this.authService.signInGoogle(googleUserDto);
    const tokenUrl = process.env.ORIGIN + '/jwtToken/' + accessToken;
    res.redirect(tokenUrl);
  }
}
