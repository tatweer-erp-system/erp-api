import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateJobPositionDto {
  @ApiProperty({ description: 'Position name in English', example: 'Senior Developer' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Position name in Arabic', example: 'مطور أول' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiPropertyOptional({ description: 'Department ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
