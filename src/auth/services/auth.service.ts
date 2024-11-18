import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { CreateUserDto } from 'src/users/dto/user.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from './refresh-token.service';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from 'src/mail/mail.service';

interface JwtPayload {
  sub: number;
  username: string;
}

interface OAuthUserData {
  email: string;
  username: string;
  picture: string;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
    private mailService: MailService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const { email, password } = createUserDto;

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();

    try {
      const existingUser = await this.userService.findByEmail(email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
      const user = await this.userService.create({
        ...createUserDto,
        password: hashedPassword,
        verificationToken,
        provider: 'local',
        isEmailVerified: false,
      });

      await this.mailService.sendVerificationEmail(email, verificationToken);

      const { password: _, ...result } = user;

      return {
        message:
          'Registration successful. Please check your email to verify your email.',
        user: result,
      };
    } catch (err) {
      console.error('Registration error:', err);
      throw new InternalServerErrorException('Failed to register user');
    }
  }

  async login(email: string, password: string) {
    try {
      const user = await this.userService.findByEmail(email);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.isEmailVerified) {
        throw new UnauthorizedException(
          'Please verify your email before logging in',
        );
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
      const { password: _, ...result } = user;
      const payload: JwtPayload = {
        sub: user.id,
        username: user.username,
      };

      const tokens = await this.generateToken(payload);

      return {
        ...tokens,
        user: result,
      };
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new InternalServerErrorException('Failed to login user');
    }
  }

  private async generateToken(
    payload: JwtPayload,
  ): Promise<{ access_token: string; refresh_token: string }> {
    try {
      const [access_token, refresh_token] = await Promise.all([
        this.jwtService.signAsync(payload, {
          expiresIn: '1h',
        }),
        this.jwtService.signAsync(payload, {
          expiresIn: '7d',
          secret: process.env.JWT_REFRESH_SECRET,
        }),
      ]);

      await this.refreshTokenService.createRefreshToken(
        payload.sub,
        refresh_token,
      );

      return { access_token, refresh_token };
    } catch (error) {
      console.error('Token generation error:', error);
      throw new InternalServerErrorException('Failed to generate tokens');
    }
  }

  async refreshToken(
    token: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    try {
      const savedToken = await this.refreshTokenService.findByToken(token);
      if (!savedToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (savedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token has expired');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      // Implement refresh token rotation
      await this.refreshTokenService.revokeToken(token);

      const newPayload: JwtPayload = {
        sub: payload.sub,
        username: payload.username,
      };

      const access_token = await this.jwtService.signAsync(newPayload, {
        expiresIn: '1h',
      });

      const refresh_token = await this.jwtService.signAsync(newPayload, {
        expiresIn: '7d',
        secret: process.env.JWT_REFRESH_SECRET,
      });

      await this.refreshTokenService.createRefreshToken(
        payload.sub,
        refresh_token,
      );

      return {
        access_token,
        refresh_token,
      };
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateOAuthUser(userData: OAuthUserData) {
    try {
      let user = await this.userService.findByEmail(userData.email);

      if (!user) {
        // Create new user if doesn't exist
        user = await this.userService.create({
          email: userData.email,
          username: userData.username,
          password: '',
          picture: userData.picture,
          isEmailVerified: true,
        });
      }

      // Generate JWT tokens
      const payload: JwtPayload = {
        sub: user.id,
        username: user.username,
      };

      const tokens = await this.generateToken(payload);

      // Save OAuth refresh token
      if (userData.refreshToken) {
        await this.refreshTokenService.createRefreshToken(
          user.id,
          userData.refreshToken,
        );
      }

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          picture: user.picture,
          provider: user.provider,
        },
      };
    } catch (error) {
      console.error('OAuth validation error:', error);
      throw new InternalServerErrorException('Failed to process OAuth login');
    }
  }

  async verifyEmail(token: string) {
    try {
      const user = await this.userService.findByVerificationToken(token);
      if (!user) {
        throw new NotFoundException('Invalid verification token');
      }

      await this.userService.update(user.id, {
        isEmailVerified: true,
        verificationToken: null,
      });

      return { message: 'Email verified successfully' };
    } catch (error) {
      throw new UnauthorizedException('Invalid verification token');
    }
  }

  async forgotPassword(email: string) {
    try {
      const user = await this.userService.findByEmail(email);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const resetToken = uuidv4();
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      await this.userService.update(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      });

      await this.mailService.sendPasswordResetEmail(email, resetToken);

      return {
        message: 'Password reset instructions have been sent to your email',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to process password reset',
      );
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const user = await this.userService.findByResetToken(token);
      if (!user) {
        throw new UnauthorizedException('Invalid reset token');
      }

      if (
        !user.passwordResetExpires ||
        user.passwordResetExpires < new Date()
      ) {
        throw new UnauthorizedException('Reset token has expired');
      }

      await this.userService.update(user.id, {
        password: newPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      });

      return {
        message:
          'Password has been reset successfully. Please login with your new password.',
      };
    } catch (error) {
      console.error('Reset password error:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to reset password');
    }
  }
}
