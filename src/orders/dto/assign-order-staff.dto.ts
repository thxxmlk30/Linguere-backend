import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignOrderStaffDto {
  @ApiPropertyOptional({ example: 'staff-id-uuid' })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiPropertyOptional({ example: 'Nom du membre' })
  @IsOptional()
  @IsString()
  staffName?: string;
}
