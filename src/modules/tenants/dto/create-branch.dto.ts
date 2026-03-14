import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ description: 'Branch name in English', example: 'Main Branch' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nameEn: string;

  @ApiProperty({ description: 'Branch name in Arabic', example: 'الفرع الرئيسي' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nameAr: string;

  @ApiPropertyOptional({
    description: 'Description in English',
    example: 'Main headquarters branch',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description in Arabic', example: 'فرع المقر الرئيسي' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionAr?: string;

  @ApiProperty({ description: 'Branch code (unique per tenant)', example: 'BR-001' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({ description: 'Whether this is the main branch', default: false })
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;

  @ApiPropertyOptional({ description: 'Whether the branch is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Branch address', example: '123 Main St' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'Branch phone number', example: '+966500000000' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
