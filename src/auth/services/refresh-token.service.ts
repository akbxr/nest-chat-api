import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RefreshToken } from './../entities/refresh-token.entity';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deleteExpiredAndRevokedTokens() {
    try {
      const now = new Date();
      const result = await this.refreshTokenRepository.delete({
        expiresAt: LessThan(now),
        isRevoked: true,
      });
    } catch (error) {
      console.error('Error cleaning up refresh tokens', error);
    }
  }

  async createRefreshToken(
    userId: number,
    token: string,
  ): Promise<RefreshToken> {
    try {
      const refreshToken = this.refreshTokenRepository.create({
        userId,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return await this.refreshTokenRepository.save(refreshToken);
    } catch (error) {
      console.error('Create refresh token error:', error);
      throw new InternalServerErrorException('Failed to create refresh token');
    }
  }

  async getOAuthRefreshToken(
    userId: number,
    provider: string,
  ): Promise<RefreshToken> {
    return this.refreshTokenRepository.findOne({
      where: {
        userId,
        isRevoked: false,
      },
    });
  }

  async findByToken(token: string): Promise<RefreshToken> {
    return this.refreshTokenRepository.findOne({
      where: { token, isRevoked: false },
      relations: ['user'],
    });
  }

  async revokeToken(token: string): Promise<void> {
    await this.refreshTokenRepository.update({ token }, { isRevoked: true });
  }

  async deleteExpiredTokens(): Promise<void> {
    await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }
}
