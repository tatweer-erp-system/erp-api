import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsNumber,
  IsIn,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ description: 'Project ID', format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  projectId!: string;

  @ApiProperty({ description: 'Task title in English' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title_en!: string;

  @ApiProperty({ description: 'Task title in Arabic' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title_ar!: string;

  @ApiPropertyOptional({ description: 'Description in English' })
  @IsOptional()
  @IsString()
  description_en?: string;

  @ApiPropertyOptional({ description: 'Description in Arabic' })
  @IsOptional()
  @IsString()
  description_ar?: string;

  @ApiPropertyOptional({ description: 'Assignee user ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({
    description: 'Task priority',
    enum: ['low', 'medium', 'high', 'critical'],
  })
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority?: 'low' | 'medium' | 'high' | 'critical';

  @ApiPropertyOptional({ description: 'Due date (ISO format)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Estimated hours', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @ApiPropertyOptional({ description: 'Parent task ID for sub-tasks', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  parentTaskId?: string;
}
