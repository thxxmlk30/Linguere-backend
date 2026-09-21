import { IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetRatesQueryDto {
  @ApiPropertyOptional({ example: 'XOF' })
  @IsOptional()
  @Matches(/^[A-Za-z]{3}$/, {
    message: 'base doit etre un code devise ISO-4217 (3 lettres)',
  })
  base?: string;
}
