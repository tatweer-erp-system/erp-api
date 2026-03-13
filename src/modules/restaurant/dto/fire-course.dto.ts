import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { CourseType } from '@/common/enums/pos.enums';

export class FireCourseDto {
  @ApiProperty({ description: 'POS Order ID' })
  @IsUUID()
  @IsNotEmpty()
  orderId!: string;

  @ApiPropertyOptional({ description: 'Table session ID' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Table number for display on KDS' })
  @IsOptional()
  @IsString()
  tableNumber?: string;

  @ApiProperty({ enum: CourseType, description: 'Course type' })
  @IsEnum(CourseType)
  course!: CourseType;

  @ApiProperty({ description: 'List of order item IDs to fire (BIGINT as string)', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderItemIds!: string[];

  @ApiPropertyOptional({ description: 'Estimated preparation time in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;
}
