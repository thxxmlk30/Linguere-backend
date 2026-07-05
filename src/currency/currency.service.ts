import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';

const RATES_CACHE_TTL = 60 * 60 * 1000; // 1h : les taux de change ne bougent pas à la minute

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /** Récupère tous les taux de change pour une devise de base donnée. */
  async getRates(base?: string): Promise<Record<string, number>> {
    const baseCurrency = (
      base ??
      this.configService.get<string>('EXCHANGE_RATE_BASE_CURRENCY', 'XOF')
    ).toUpperCase();

    const cacheKey = `currency:rates:${baseCurrency}`;
    const cached =
      await this.cacheManager.get<Record<string, number>>(cacheKey);
    if (cached) return cached;

    // API gratuite, sans clé requise (open.er-api.com)
    const url = `https://open.er-api.com/v6/latest/${baseCurrency}`;

    try {
      const response = await firstValueFrom(this.httpService.get(url));

      if (response.data.result !== 'success') {
        throw new Error(response.data['error-type'] ?? 'Réponse invalide');
      }

      const rates = response.data.rates;
      await this.cacheManager.set(cacheKey, rates, RATES_CACHE_TTL);
      return rates;
    } catch (error) {
      this.logger.error(`Erreur ExchangeRate API: ${error.message}`);
      throw new ServiceUnavailableException(
        'Service de conversion de devises temporairement indisponible',
      );
    }
  }

  /** Convertit un montant d'une devise vers une autre. */
  async convert(from: string, to: string, amount: number) {
    const fromCurrency = from.toUpperCase();
    const toCurrency = to.toUpperCase();

    const rates = await this.getRates(fromCurrency);
    const rate = rates[toCurrency];

    if (rate === undefined) {
      throw new ServiceUnavailableException(
        `Devise cible inconnue : ${toCurrency}`,
      );
    }

    const convertedAmount = Number((amount * rate).toFixed(2));

    return {
      from: fromCurrency,
      to: toCurrency,
      amount,
      rate,
      convertedAmount,
    };
  }
}
