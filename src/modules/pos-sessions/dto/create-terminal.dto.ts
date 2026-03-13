import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTerminalDto {
  @ApiProperty({ example: 'Terminal 1' })
  @IsString()
  @IsNotEmpty()
  name!: string;

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
