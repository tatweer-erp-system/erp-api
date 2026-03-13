import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { TableStatus } from '@/common/enums/pos.enums';

export class CreateTableDto {
  @ApiProperty({ description: 'Section ID' })
  @IsUUID()
  @IsNotEmpty()
  sectionId!: string;

  @ApiProperty({ description: 'Table number (unique within section)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  number!: string;

  @ApiPropertyOptional({ description: 'Maximum capacity', default: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Minimum capacity', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minCapacity?: number;

  @ApiPropertyOptional({ enum: TableStatus, default: TableStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus;

  @ApiPropertyOptional({ description: 'Canvas X position', default: 0 })
  @IsOptional()
  @IsInt()
  posX?: number;

  @ApiPropertyOptional({ description: 'Canvas Y position', default: 0 })
  @IsOptional()
  @IsInt()
  posY?: number;

  @ApiPropertyOptional({ description: 'Table shape', default: 'square' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  shape?: string;

  @ApiPropertyOptional({ description: 'Width in pixels', default: 80 })
  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({ description: 'Height in pixels', default: 80 })
  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({ description: 'Whether table is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
