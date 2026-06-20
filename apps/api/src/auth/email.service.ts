import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService) {
    this.resend = new Resend(config.get<string>('RESEND_API_KEY'));
    this.from = config.get<string>('FROM_EMAIL', 'onboarding@resend.dev');
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject: 'Reset your password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#1a1a1a">Reset your password</h2>
            <p style="color:#555">Click the button below to set a new password. This link expires in 15 minutes.</p>
            <a href="${resetUrl}"
               style="display:inline-block;margin:16px 0;padding:12px 24px;background:#4F6EF7;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
              Reset password
            </a>
            <p style="color:#999;font-size:12px">If you didn't request this, ignore this email.</p>
          </div>
        `,
      });
    } catch (e) {
      this.logger.error('Failed to send password reset email', e);
      throw e;
    }
  }
}
