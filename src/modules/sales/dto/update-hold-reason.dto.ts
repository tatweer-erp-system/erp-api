import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsInt, MaxLength, Min } from 'class-validator';

export class UpdateHoldReasonDto {
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

  @ApiPropertyOptional({ description: 'Maximum hold duration in minutes' })
  @IsOptional()
  @IsNumber()
  @IsInt()
  maxHoldMinutes?: number;

  @ApiPropertyOptional({ description: 'Whether this reason is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
