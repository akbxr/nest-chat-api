import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendVerificationEmail(email: string, token: string) {
    const url = `http://localhost:8000/api/auth/verify-email?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Welcome! Confirm your Email',
      template: './verification',
      context: {
        name: email,
        url,
      },
    });
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const url = `http://localhost:8000/api/reset-password?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Password Reset Request',
      template: './reset-password',
      context: {
        name: email,
        url,
      },
    });
  }
}
