import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { WeatherService } from './weather.service';

describe('WeatherService', () => {
  let service: WeatherService;

  const mockHttpService = { get: jest.fn() };
  const mockConfigService = {
    get: jest.fn().mockReturnValue('fake-api-key'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('fake-api-key');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeatherService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WeatherService>(WeatherService);
  });

  it('encode le nom de ville dans l’URL sortante', async () => {
    let capturedUrl = '';
    mockHttpService.get.mockImplementation((url: string) => {
      capturedUrl = url;
      return of({
        data: {
          name: 'Dakar',
          main: { temp: 28, humidity: 60 },
          weather: [{ description: 'ensoleillé' }],
          wind: { speed: 3 },
        },
      });
    });

    await service.getWeather('Dakar & Co/ville');

    expect(capturedUrl).toContain(encodeURIComponent('Dakar & Co/ville'));
    expect(capturedUrl).not.toContain('Dakar & Co/ville&appid');
  });

  it("renvoie une 503 propre si la clé API n'est pas configurée", async () => {
    mockConfigService.get.mockReturnValue(undefined);

    await expect(service.getWeather('Dakar')).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(mockHttpService.get).not.toHaveBeenCalled();
  });

  it("renvoie une 503 propre si l'API amont échoue", async () => {
    mockHttpService.get.mockReturnValue(throwError(() => new Error('timeout')));

    await expect(service.getWeather('Dakar')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
