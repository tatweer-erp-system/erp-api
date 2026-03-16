import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsBoolean, MaxLength } from 'class-validator';

export class CreateJobTitleDto {
  @ApiProperty({ description: 'Job title in English', example: 'Software Engineer' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Job title in Arabic', example: 'مهندس برمجيات' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiPropertyOptional({ description: 'Department ID (UUID)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Job grade', example: 'L5' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  grade?: string;

  @ApiPropertyOptional({ description: 'Whether the job title is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
