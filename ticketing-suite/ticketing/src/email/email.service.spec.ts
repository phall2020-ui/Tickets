import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let mailerService: MailerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    mailerService = module.get<MailerService>(MailerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendWelcomeEmail', () => {
    it('should not throw error when SMTP is not configured', async () => {
      await expect(
        service.sendWelcomeEmail('test@example.com', 'Test User', 'password123')
      ).resolves.not.toThrow();
    });

    it('should not throw error even if mailer fails', async () => {
      // Override environment to enable email
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'user';
      process.env.SMTP_PASS = 'pass';

      jest.spyOn(mailerService, 'sendMail').mockRejectedValue(new Error('SMTP error'));

      // Create a new instance with env vars set
      const moduleWithEnv: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: MailerService,
            useValue: {
              sendMail: jest.fn().mockRejectedValue(new Error('SMTP error')),
            },
          },
        ],
      }).compile();

      const serviceWithEnv = moduleWithEnv.get<EmailService>(EmailService);

      await expect(
        serviceWithEnv.sendWelcomeEmail('test@example.com', 'Test User', 'password123')
      ).resolves.not.toThrow();

      // Clean up
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
    });
  });
});
