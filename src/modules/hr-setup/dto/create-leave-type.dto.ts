import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateLeaveTypeDto {
  @ApiProperty({ description: 'Leave type name in English', example: 'Annual Leave' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Leave type name in Arabic', example: 'إجازة سنوية' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiPropertyOptional({ description: 'Display color', example: '#4CAF50' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({ description: 'Requires manager approval', default: true })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ description: 'Allow negative balance', default: false })
  @IsOptional()
  @IsBoolean()
  allowNegative?: boolean;

  @ApiPropertyOptional({ description: 'Whether the leave type is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
