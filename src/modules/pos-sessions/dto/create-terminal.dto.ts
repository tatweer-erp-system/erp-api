import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTerminalDto {
  @ApiProperty({ description: 'Terminal name in English', example: 'Terminal 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameEn!: string;

  @ApiProperty({ description: 'Terminal name in Arabic', example: 'نقطة بيع 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameAr!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  branchId!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: {} })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
