import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly isEnabled: boolean;

  constructor(private readonly mailerService: MailerService) {
    // Check if SMTP is configured
    this.isEnabled = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );
    
    if (!this.isEnabled) {
      this.logger.warn('Email service is disabled. Configure SMTP_* environment variables to enable.');
    }
  }

  async sendWelcomeEmail(email: string, name: string, password: string): Promise<void> {
    if (!this.isEnabled) {
      this.logger.debug(`Email sending disabled. Would have sent welcome email to ${email}`);
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Welcome to Ticketing System - Your Login Details',
        html: this.getWelcomeEmailTemplate(name, email, password),
      });
      
      this.logger.log(`Welcome email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
      // Don't throw - email sending should not block user creation
    }
  }

  private getWelcomeEmailTemplate(name: string, email: string, password: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #4a5568;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      background-color: #f7fafc;
      padding: 30px;
      border-radius: 0 0 5px 5px;
    }
    .credentials {
      background-color: white;
      padding: 15px;
      border-left: 4px solid #4a5568;
      margin: 20px 0;
    }
    .credentials strong {
      display: inline-block;
      width: 100px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 12px;
      color: #718096;
    }
    .warning {
      background-color: #fff5f5;
      border-left: 4px solid #fc8181;
      padding: 15px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Ticketing System</h1>
    </div>
    <div class="content">
      <h2>Hello ${name},</h2>
      <p>Your account has been created successfully. You can now access the ticketing system using the credentials below:</p>
      
      <div class="credentials">
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> ${password}</p>
      </div>
      
      <div class="warning">
        <p><strong>Security Notice:</strong> For security reasons, please change your password after your first login.</p>
      </div>
      
      <p>If you have any questions or need assistance, please contact your system administrator.</p>
      
      <p>Best regards,<br>The Ticketing Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
