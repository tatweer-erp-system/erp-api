import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, MaxLength, Min } from 'class-validator';

export class UpdateCancellationReasonDto {
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

  @ApiPropertyOptional({ description: 'Whether this reason requires manager approval' })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ description: 'Whether this reason is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
