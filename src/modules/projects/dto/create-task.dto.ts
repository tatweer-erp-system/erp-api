import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsNumber,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';
import { TaskPriority } from '@/common/enums/project.enums';

export class CreateTaskDto {
  @ApiProperty({ description: 'Project ID', format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  projectId!: string;

  @ApiProperty({ description: 'Task title in English' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  titleEn!: string;

  @ApiProperty({ description: 'Task title in Arabic' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  titleAr!: string;

  @ApiPropertyOptional({ description: 'Description in English' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Arabic' })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional({ description: 'Assignee user ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({
    description: 'Task priority',
    enum: TaskPriority,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

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
