import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { TableStatus } from '@/common/enums/pos.enums';

export class UpdateTableDto {
  @ApiPropertyOptional({ description: 'Section ID' })
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @ApiPropertyOptional({ description: 'Table number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  number?: string;

  @ApiPropertyOptional({ description: 'Maximum capacity' })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Minimum capacity' })
  @IsOptional()
  @IsInt()
  @Min(1)
  minCapacity?: number;

  @ApiPropertyOptional({ enum: TableStatus })
  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus;

  @ApiPropertyOptional({ description: 'Canvas X position' })
  @IsOptional()
  @IsInt()
  posX?: number;

  @ApiPropertyOptional({ description: 'Canvas Y position' })
  @IsOptional()
  @IsInt()
  posY?: number;

  @ApiPropertyOptional({ description: 'Table shape' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  shape?: string;

  @ApiPropertyOptional({ description: 'Width in pixels' })
  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({ description: 'Height in pixels' })
  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({ description: 'Whether table is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
