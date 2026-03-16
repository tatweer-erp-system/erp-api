import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsInt, MaxLength } from 'class-validator';

export class CreateHoldReasonDto {
  @ApiProperty({ description: 'English name' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Arabic name' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;

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
