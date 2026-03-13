import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TrainingStatus, TrainingType } from '@/common/enums/hr.enums';

export class CreateTrainingDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  employeeId!: string;

  @ApiProperty({ example: 'Advanced Excel Skills' })
  @IsString()
  @IsNotEmpty()
  courseName!: string;

  @ApiPropertyOptional({ example: 'Microsoft' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ enum: TrainingType, default: TrainingType.INTERNAL })
  @IsOptional()
  @IsEnum(TrainingType)
  trainingType?: TrainingType;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiPropertyOptional({ example: '2026-04-05' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  durationHours?: number;

  @ApiPropertyOptional({ enum: TrainingStatus, default: TrainingStatus.PLANNED })
  @IsOptional()
  @IsEnum(TrainingStatus)
  status?: TrainingStatus;

  @ApiPropertyOptional({ example: 92.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificateNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificateUrl?: string;

  @ApiPropertyOptional({ example: '2027-04-05' })
  @IsOptional()
  @IsDateString()
  certificateExpiry?: string;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
