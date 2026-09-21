import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';

const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
  },
}));

describe('MailService', () => {
  let service: MailService;

  const mockConfigService = {
    get: jest.fn((key: string, fallback?: unknown) => fallback),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('renvoie delivered=true quand l’envoi réussit', async () => {
    mockSendMail.mockResolvedValue(undefined);

    const result = await service.sendOtpCode(
      'client@linguere.sn',
      'Client',
      '123456',
    );

    expect(result).toEqual({ delivered: true });
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'client@linguere.sn' }),
    );
  });

  it('renvoie delivered=false sans lever d’exception quand le SMTP échoue', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP down'));

    const result = await service.sendOtpCode(
      'client@linguere.sn',
      'Client',
      '123456',
    );

    expect(result).toEqual({ delivered: false });
  });

  it('ne journalise pas le code OTP en clair hors environnement development', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    process.env.NODE_ENV = 'production';
    mockSendMail.mockRejectedValue(new Error('SMTP down'));

    await service.sendOtpCode('client@linguere.sn', 'Client', '123456');

    expect(warnSpy).not.toHaveBeenCalled();
    process.env.NODE_ENV = 'test';
    warnSpy.mockRestore();
  });

  it('journalise le code OTP uniquement en development', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    process.env.NODE_ENV = 'development';
    mockSendMail.mockRejectedValue(new Error('SMTP down'));

    await service.sendOtpCode('client@linguere.sn', 'Client', '123456');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('123456'));
    process.env.NODE_ENV = 'test';
    warnSpy.mockRestore();
  });
});
