import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { LoggerMiddleware } from './middleware/logger.moiddleware';
import { SecurityHeadersMiddleware } from './middleware/security-header.middleware';
import { RateLimiterMiddleware } from './middleware/rate-limiter.middleware';
import { ErrorTrackerMiddleware } from './middleware/error-tracker.middleware';
import { ChatModule } from './chat/chat.module';
import { RefreshTokenService } from './auth/services/refresh-token.service';
import { ScheduleModule } from '@nestjs/schedule';
import { RefreshToken } from './auth/entities/refresh-token.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DB_URL,
      migrations: ['dist/migrations/*{.ts,.js}'],
      entities: ['dist/**/*.entity{.ts,.js}'],
      autoLoadEntities: true,
      synchronize: true, // CHANGE TO false IN PROD
    }),
    TypeOrmModule.forFeature([RefreshToken]),
    MailerModule.forRoot({
      transport: {
        host: 'smtp.gmail.com',
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      },
      defaults: {
        from: '"No Reply" <noreply@example.com>',
      },
      template: {
        dir: 'src/mail/templates',
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
    UsersModule,
    AuthModule,
    ChatModule,
  ],
  providers: [RefreshTokenService],
  exports: [RefreshTokenService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        LoggerMiddleware,
        SecurityHeadersMiddleware,
        ErrorTrackerMiddleware,
      )
      .forRoutes('*')
      .apply(RateLimiterMiddleware)
      .forRoutes(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/forgot-password', method: RequestMethod.POST },
        { path: 'auth/reset-password', method: RequestMethod.POST },
      );
  }
}
