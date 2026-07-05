import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendOtpCode(
    email: string,
    fullName: string,
    code: string,
  ): Promise<{ delivered: boolean }> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>(
          'SMTP_FROM',
          'noreply@linguere.com',
        ),
        to: email,
        subject: 'Votre code de vérification - Linguere',
        html: `
          <h1>Bonjour ${fullName},</h1>
          <p>Votre code de vérification est :</p>
          <h2 style="color: #4CAF50; font-size: 32px;">${code}</h2>
          <p>Ce code expire dans 10 minutes.</p>
          <p>Si vous n'avez pas demandé ce code, ignorez cet email.</p>
        `,
      });
      this.logger.log(`OTP email sent to ${email}`);
      return { delivered: true };
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}`, error);
      // En développement, on log juste le code
      this.logger.warn(`[DEV] OTP code for ${email}: ${code}`);
      return { delivered: false };
    }
  }
}
