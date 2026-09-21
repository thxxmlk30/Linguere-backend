import { Test, TestingModule } from '@nestjs/testing';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CurrencyController } from './currency.controller';
import { CurrencyService } from './currency.service';
import { GetRatesQueryDto } from './dto/get-rates-query.dto';
import { ConvertCurrencyQueryDto } from './dto/convert-currency-query.dto';

describe('CurrencyController', () => {
  let controller: CurrencyController;

  const mockCurrencyService = {
    getRates: jest.fn().mockResolvedValue({ EUR: 0.0015 }),
    convert: jest.fn().mockResolvedValue({ convertedAmount: 1.5 }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CurrencyController],
      providers: [{ provide: CurrencyService, useValue: mockCurrencyService }],
    }).compile();

    controller = module.get<CurrencyController>(CurrencyController);
  });

  it('délègue getRates avec la devise de base fournie', async () => {
    await controller.getRates({ base: 'XOF' });
    expect(mockCurrencyService.getRates).toHaveBeenCalledWith('XOF');
  });

  it('délègue convert avec les paramètres validés', async () => {
    await controller.convert({ from: 'XOF', to: 'EUR', amount: 1000 });
    expect(mockCurrencyService.convert).toHaveBeenCalledWith(
      'XOF',
      'EUR',
      1000,
    );
  });

  describe('validation des DTO', () => {
    it('rejette un code devise base invalide', async () => {
      const dto = plainToInstance(GetRatesQueryDto, { base: 'not-a-currency' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejette un montant négatif ou manquant pour convert', async () => {
      const dto = plainToInstance(ConvertCurrencyQueryDto, {
        from: 'XOF',
        to: 'EUR',
        amount: -5,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('accepte des paramètres valides pour convert', async () => {
      const dto = plainToInstance(ConvertCurrencyQueryDto, {
        from: 'xof',
        to: 'eur',
        amount: '1000',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
