import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, MaxLength } from 'class-validator';
import { VoidRefundReasonType } from '@/common/enums/definitions.enums';

export class CreateVoidRefundReasonDto {
  @ApiProperty({ description: 'English name' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Arabic name' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;

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
