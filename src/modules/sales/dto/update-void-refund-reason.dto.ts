import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, MaxLength, Min } from 'class-validator';
import { VoidRefundReasonType } from '@/common/enums/definitions.enums';

export class UpdateVoidRefundReasonDto {
  @ApiProperty({ description: 'Record version for optimistic locking' })
  @IsInt()
  @Min(0)
  version!: number;

  @ApiPropertyOptional({ description: 'English name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Arabic name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameAr?: string;

  @ApiPropertyOptional({
    enum: VoidRefundReasonType,
    description: 'Reason type — void, refund, or both',
  })
  @IsOptional()
  @IsEnum(VoidRefundReasonType)
  type?: VoidRefundReasonType;

  @ApiPropertyOptional({ description: 'Whether this reason requires a manager override' })
  @IsOptional()
  @IsBoolean()
  requiresManager?: boolean;

  @ApiPropertyOptional({ description: 'Whether this reason is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
