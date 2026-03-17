import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsNumber, MaxLength } from 'class-validator';

export class UpdateJobPositionDto {
  @ApiPropertyOptional({ description: 'Position name in English' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Position name in Arabic' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameAr?: string;

  @ApiPropertyOptional({ description: 'Department ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string | null;

  @ApiProperty({ description: 'Optimistic lock version' })
  @IsNumber()
  version!: number;
}
