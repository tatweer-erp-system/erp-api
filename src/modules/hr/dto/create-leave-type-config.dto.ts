import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, MaxLength } from 'class-validator';

export class CreateLeaveTypeConfigDto {
  @ApiProperty({ description: 'Leave type name in English', example: 'Annual Leave' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Leave type name in Arabic', example: 'إجازة سنوية' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiPropertyOptional({
    description: 'Description in English',
    example: 'Paid annual leave entitlement',
  })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({
    description: 'Description in Arabic',
    example: 'استحقاق الإجازة السنوية المدفوعة',
  })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiProperty({ description: 'Number of days allowed per year', example: 21 })
  @IsInt()
  daysPerYear!: number;

  @ApiPropertyOptional({ description: 'Whether this leave type is paid', default: true })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @ApiPropertyOptional({ description: 'Whether this leave type requires approval', default: true })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ description: 'Whether this leave type is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
