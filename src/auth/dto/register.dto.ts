import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'client@linguere.sn' })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({ example: 'Amina Diop' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: 'MotDePasse123' })
  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;

  @ApiPropertyOptional({ enum: Role, default: Role.CLIENT })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
