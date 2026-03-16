import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsBoolean, MaxLength, IsNumber } from 'class-validator';

export class UpdateJobTitleDto {
  @ApiPropertyOptional({ description: 'Job title in English', example: 'Software Engineer' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Job title in Arabic', example: 'مهندس برمجيات' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameAr?: string;

  @ApiPropertyOptional({ description: 'Department ID (UUID)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Job grade', example: 'L5' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  grade?: string;

  @ApiPropertyOptional({ description: 'Whether the job title is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Optimistic lock version' })
  @IsNumber()
  version!: number;
}
