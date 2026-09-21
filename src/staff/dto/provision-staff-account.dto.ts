import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ProvisionStaffAccountDto {
  @ApiPropertyOptional({
    description: 'Mot de passe initial (généré aléatoirement si absent)',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
