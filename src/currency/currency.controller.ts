import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrencyService } from './currency.service';

@ApiTags('currency')
@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('rates')
  @ApiOperation({
    summary: "Taux de change actuels pour une devise de base (ex: XOF)",
  })
  getRates(@Query('base') base?: string) {
    return this.currencyService.getRates(base);
  }

  @Get('convert')
  @ApiOperation({
    summary: "Convertir un montant d'une devise vers une autre",
  })
  convert(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('amount') amount: string,
  ) {
    return this.currencyService.convert(from, to, Number(amount));
  }
}
