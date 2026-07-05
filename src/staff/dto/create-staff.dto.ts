import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStaffDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ enum: ['admin', 'waiter', 'chef', 'delivery'] })
  @IsIn(['admin', 'waiter', 'chef', 'delivery'])
  role: 'admin' | 'waiter' | 'chef' | 'delivery';

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shift?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zone?: string;

  @ApiPropertyOptional({ enum: ['active', 'break', 'off'] })
  @IsOptional()
  @IsIn(['active', 'break', 'off'])
  status?: 'active' | 'break' | 'off';
}
