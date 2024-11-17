import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { CreateUserDto } from 'src/users/dto/user.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from './refresh-token.service';

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
  ) {}

  async register(createUserDto: CreateUserDto) {
    const { email, password } = createUserDto;

    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const existingUser = await this.userService.findByEmail(email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
      const user = await this.userService.create({
        ...createUserDto,
        password: hashedPassword,
      });

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

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

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
        },
      };
    } catch (error) {
      console.error('OAuth validation error:', error);
      throw new InternalServerErrorException('Failed to process OAuth login');
    }
  }
}
