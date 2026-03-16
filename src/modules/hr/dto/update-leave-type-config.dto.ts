import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, MaxLength, IsNumber } from 'class-validator';

export class UpdateLeaveTypeConfigDto {
  @ApiPropertyOptional({ description: 'Leave type name in English', example: 'Annual Leave' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Leave type name in Arabic', example: 'إجازة سنوية' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameAr?: string;

  @ApiPropertyOptional({ description: 'Description in English' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Arabic' })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional({ description: 'Number of days allowed per year', example: 21 })
  @IsOptional()
  @IsInt()
  daysPerYear?: number;

  @ApiPropertyOptional({ description: 'Whether this leave type is paid' })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @ApiPropertyOptional({ description: 'Whether this leave type requires approval' })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ description: 'Whether this leave type is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Optimistic lock version' })
  @IsNumber()
  version!: number;
}
