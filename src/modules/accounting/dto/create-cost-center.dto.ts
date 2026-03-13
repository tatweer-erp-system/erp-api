import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateCostCenterDto {
  @ApiProperty({ example: 'CC-100' })
  @IsString()
  @MaxLength(20)
  code!: string;

  @ApiProperty()
  @IsString()
  nameEn!: string;

  @ApiProperty()
  @IsString()
  nameAr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
