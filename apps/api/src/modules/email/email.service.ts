import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: parseInt(this.configService.get('SMTP_PORT') || '465'),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  private get fromAddress(): string {
    return this.configService.get('SMTP_FROM') || 'noreply@kpd.2klika.hr';
  }

  private get frontendUrl(): string {
    return this.configService.get('FRONTEND_URL') || 'https://kpd.2klika.hr';
  }

  /**
   * Pošalji email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: `"KPD 2klika" <${this.fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      });
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  /**
   * Email za verifikaciju email adrese
   */
  async sendVerificationEmail(
    email: string,
    firstName: string | null,
    token: string,
  ): Promise<boolean> {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    const name = firstName || 'korisniče';

    const html = this.getEmailTemplate({
      title: 'Potvrdite email adresu',
      preheader: 'Dobrodošli u KPD 2klika! Potvrdite svoju email adresu.',
      content: `
        <h1 style="color: #1a1a2e; margin: 0 0 20px;">Dobrodošli, ${name}!</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          Hvala što ste se registrirali na KPD 2klika - platformu za klasifikaciju proizvoda i usluga.
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
          Molimo potvrdite svoju email adresu klikom na gumb ispod:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}"
             style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Potvrdi email adresu
          </a>
        </div>
        <p style="color: #888; font-size: 14px; margin: 20px 0 0;">
          Ili kopirajte ovaj link u preglednik:<br>
          <a href="${verifyUrl}" style="color: #667eea; word-break: break-all;">${verifyUrl}</a>
        </p>
        <p style="color: #888; font-size: 14px; margin: 20px 0 0;">
          Link vrijedi 24 sata.
        </p>
      `,
    });

    return this.sendEmail({
      to: email,
      subject: 'Potvrdite email adresu - KPD 2klika',
      html,
    });
  }

  /**
   * Email za reset lozinke
   */
  async sendPasswordResetEmail(
    email: string,
    firstName: string | null,
    token: string,
  ): Promise<boolean> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
    const name = firstName || 'korisniče';

    const html = this.getEmailTemplate({
      title: 'Reset lozinke',
      preheader: 'Zatražili ste promjenu lozinke na KPD 2klika.',
      content: `
        <h1 style="color: #1a1a2e; margin: 0 0 20px;">Pozdrav, ${name}!</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          Primili smo zahtjev za promjenu lozinke vašeg KPD 2klika računa.
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
          Kliknite na gumb ispod za postavljanje nove lozinke:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Postavi novu lozinku
          </a>
        </div>
        <p style="color: #888; font-size: 14px; margin: 20px 0 0;">
          Ili kopirajte ovaj link u preglednik:<br>
          <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
        </p>
        <p style="color: #888; font-size: 14px; margin: 20px 0 0;">
          Link vrijedi 1 sat. Ako niste zatražili promjenu lozinke, ignorirajte ovaj email.
        </p>
      `,
    });

    return this.sendEmail({
      to: email,
      subject: 'Reset lozinke - KPD 2klika',
      html,
    });
  }

  /**
   * Email za pozivnicu u organizaciju
   */
  async sendInvitationEmail(
    email: string,
    organizationName: string,
    inviterName: string,
    token: string,
  ): Promise<boolean> {
    const inviteUrl = `${this.frontendUrl}/invite?token=${token}`;

    const html = this.getEmailTemplate({
      title: 'Pozivnica u organizaciju',
      preheader: `${inviterName} vas poziva da se pridružite organizaciji ${organizationName}.`,
      content: `
        <h1 style="color: #1a1a2e; margin: 0 0 20px;">Pozvani ste!</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          <strong>${inviterName}</strong> vas poziva da se pridružite organizaciji
          <strong>${organizationName}</strong> na KPD 2klika platformi.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}"
             style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Prihvati pozivnicu
          </a>
        </div>
        <p style="color: #888; font-size: 14px; margin: 20px 0 0;">
          Pozivnica vrijedi 7 dana.
        </p>
      `,
    });

    return this.sendEmail({
      to: email,
      subject: `Pozivnica u ${organizationName} - KPD 2klika`,
      html,
    });
  }

  /**
   * Dobrodošli email (nakon verifikacije)
   */
  async sendWelcomeEmail(
    email: string,
    firstName: string | null,
  ): Promise<boolean> {
    const name = firstName || 'korisniče';
    const dashboardUrl = `${this.frontendUrl}/dashboard`;

    const html = this.getEmailTemplate({
      title: 'Dobrodošli!',
      preheader: 'Vaš KPD 2klika račun je aktiviran.',
      content: `
        <h1 style="color: #1a1a2e; margin: 0 0 20px;">Dobrodošli u KPD 2klika!</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          Pozdrav ${name},
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          Vaš račun je uspješno aktiviran! Sada možete koristiti KPD 2klika za klasifikaciju proizvoda i usluga prema NKD/KPD standardima.
        </p>
        <h2 style="color: #1a1a2e; font-size: 18px; margin: 30px 0 15px;">Što možete raditi:</h2>
        <ul style="color: #4a4a4a; font-size: 16px; line-height: 1.8; margin: 0 0 30px; padding-left: 20px;">
          <li>Klasificirati proizvode i usluge pomoću AI</li>
          <li>Pretraživati KPD šifre</li>
          <li>Spremati povijest upita</li>
          <li>Pozivati članove tima</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}"
             style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Idi na Dashboard
          </a>
        </div>
      `,
    });

    return this.sendEmail({
      to: email,
      subject: 'Dobrodošli u KPD 2klika!',
      html,
    });
  }

  /**
   * Base email template
   */
  private getEmailTemplate(options: {
    title: string;
    preheader: string;
    content: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="hr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <!-- Preheader -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${options.preheader}
  </div>

  <!-- Email Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f7;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px;">

          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                KPD 2klika
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Klasifikacija proizvoda i usluga
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px; background-color: white; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              ${options.content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 10px; color: #888; font-size: 14px;">
                KPD 2klika - Klasifikacija proizvoda i usluga
              </p>
              <p style="margin: 0; color: #aaa; font-size: 12px;">
                © ${new Date().getFullYear()} 2klika d.o.o. Sva prava pridržana.
              </p>
              <p style="margin: 15px 0 0; color: #aaa; font-size: 12px;">
                <a href="${this.frontendUrl}" style="color: #667eea; text-decoration: none;">kpd.2klika.hr</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*<\/style>/gi, '')
      .replace(/<script[^>]*>.*<\/script>/gi, '')
      .replace(/<[^>]+>/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
