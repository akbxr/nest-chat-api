import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  Get,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { CreateUserDto, LoginUserDto } from 'src/users/dto/user.dto';
import { AuthGuard } from '@nestjs/passport';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UsersService } from 'src/users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto.email, loginUserDto.password);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: Request) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    try {
      const { access_token, refresh_token, user } = req.user;

      const params = new URLSearchParams({
        access_token,
        refresh_token,
        user: encodeURIComponent(JSON.stringify(user)),
      });

      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/callback?${params.toString()}`,
      );
    } catch (error) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(error.message)}`,
      );
    }
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth(@Req() req: Request) {}

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthRedirect(@Req() req, @Res() res) {
    try {
      const { access_token, refresh_token, user } = req.user;

      const params = new URLSearchParams({
        access_token,
        refresh_token,
        user: encodeURIComponent(JSON.stringify(user)),
      });

      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/callback?${params.toString()}`,
      );
    } catch (error) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(error.message)}`,
      );
    }
  }

  @Post('refresh')
  async refreshToken(@Body('refresh_token') token: string) {
    return this.authService.refreshToken(token);
  }

  @Get('verify')
  @UseGuards(AuthGuard('jwt'))
  async verify(@Request() req) {
    const user = await this.userService.findById(req.user.id);
    return {
      email: user.email,
      username: user.username,
    };
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPassword: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPassword.token,
      resetPassword.newPassword,
    );
  }
}
