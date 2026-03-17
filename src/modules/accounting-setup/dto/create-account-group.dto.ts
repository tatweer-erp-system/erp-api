import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateAccountGroupDto {
  @ApiProperty({ example: '10', description: 'Code prefix for the account group' })
  @IsString()
  @MaxLength(10)
  codePrefix!: string;

  @ApiProperty({ description: 'Group name in English', example: 'Current Assets' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Group name in Arabic', example: 'الأصول المتداولة' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiPropertyOptional({ description: 'Parent account group ID' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
