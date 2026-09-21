import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';

describe('GoogleStrategy', () => {
  const mockConfigService = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'GOOGLE_CLIENT_ID') return 'test-client-id';
      if (key === 'GOOGLE_CLIENT_SECRET') return 'test-client-secret';
      return fallback ?? '';
    }),
  } as unknown as ConfigService;

  let strategy: GoogleStrategy;

  beforeEach(() => {
    strategy = new GoogleStrategy(mockConfigService);
  });

  it('construit le profil utilisateur quand un email est présent', () => {
    const done = jest.fn();

    strategy.validate(
      'access-token',
      'refresh-token',
      {
        id: 'google-id-1',
        name: { givenName: 'Amina', familyName: 'Diop' },
        emails: [{ value: 'amina@example.com' }],
      },
      done,
    );

    expect(done).toHaveBeenCalledWith(null, {
      providerId: 'google-id-1',
      email: 'amina@example.com',
      fullName: 'Amina Diop',
    });
  });

  it('rejette un profil Google sans email public au lieu de planter', () => {
    const done = jest.fn();

    strategy.validate(
      'access-token',
      'refresh-token',
      {
        id: 'google-id-2',
        name: { givenName: 'Amina', familyName: 'Diop' },
        emails: [],
      },
      done,
    );

    expect(done).toHaveBeenCalledWith(expect.any(UnauthorizedException), false);
  });
});
